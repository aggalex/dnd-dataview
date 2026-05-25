import {DataView, Reference} from "@/model/Dataview";
import {AbilityBonus, Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {CalculatedCharacter, Character} from "@/model/Character";
import {ABILITIES, Ability, AbilityBonusProvider, AbilityScores, Skill, SKILLS, SkillScores} from "@/model/Abilities";
import {AbilityBonusRepository} from "@/repository/AbilityRepository";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {RaceRepository} from "@/repository/RaceRepository";
import {Controller} from "@/controller/Controller";
import {ArmorRepository} from "@/repository/EquipmentRepository";
import {FeatureProviderRepository, FeatureRepository} from "@/repository/FeatureRepository";
import {ClassRepository} from "@/repository/ClassRepository";
import {BackgroundRepository} from "@/repository/BackgroundRepository";
import {FeatureProvider} from "@/model/Feature";
import {ErrorViewModel} from "@/viewModel/ErrorViewModel";
import {Class} from "@/model/Class";
import {Logger} from "@/controller/Logger";

interface ClassDescriptor {
    class?: Class,
    subclass?: Class,
    level: number
}

export class CharacterLogicController extends Controller {

    constructor(
        dv: DataView,
        private readonly errorViewModel: ErrorViewModel,
        private readonly abilityBonusRepository = new AbilityBonusRepository(dv),
        private readonly proficiencyRepository = new ProficiencyRepository(dv),
        private readonly raceRepository = new RaceRepository(dv),
        private readonly armorRepository = new ArmorRepository(dv),
        private readonly featureRepository = new FeatureRepository(dv),
        private readonly featureProviderRepository = new FeatureProviderRepository(dv),
        private readonly classRepository = new ClassRepository(dv),
        private readonly backgroundRepository = new BackgroundRepository(dv),
        private readonly logger = new Logger(dv, CharacterLogicController.name)
    ) {
        super(dv);
    }

    async calculateCharacter(character: Character): Promise<CalculatedCharacter> {

        const proficiencyBonus = this.calculateProficiencyBonus(character);

        const race = this.raceRepository.getByReference(character.race)
            ?.transform(this.errorViewModel.handle(character.race, "Race"));

        const background = character.background && this.backgroundRepository.getByReference(character.background)
            ?.transform(this.errorViewModel.handle(character.background, "Background"));

        const armor = character.armor && this.armorRepository.getByReference(character.armor)
            ?.transform(this.errorViewModel.handle(character.armor, "Armor"));

        const classes = character.class.map(desc => ({
            class: this.classRepository.getByReference(desc.class)
                ?.transform(this.errorViewModel.handle(desc.class, "Class")),
            subclass: desc.subclass && this.classRepository.getByReference(desc.subclass)
                ?.transform(this.errorViewModel.handle(desc.subclass, "Subclass")),
            level: desc.level
        }) satisfies ClassDescriptor);

        const dependencies = [
            character,
            ...classes
                .flatMap(desc => [desc.class, desc.subclass]),
            background
        ].filter((a): a is NonNullable<typeof a> => !!a);

        const abilityBonusProviders: AbilityBonusProvider[] = [...dependencies, ...(race?.abilityBonusProviders ?? [])]
            .filter((a): a is NonNullable<typeof a> => !!a.abilityBonus && Object.keys(a.abilityBonus).length > 0);

        const proficiencies: ProficiencyIndex = new ProficiencyIndex(...[...dependencies, ...(race? [race]: [])]
            .flatMap(item => item.proficiencies)
            .filter((a): a is NonNullable<typeof a> => !!a))

        const abilityScores = this.calculateAbilityScores(character, abilityBonusProviders);
        const abilityChecks = this.calculateAbilityChecks(abilityScores);
        const savingThrows = this.calculateSavingThrows(abilityChecks, proficiencies, proficiencyBonus);
        const skills = this.calculateSkills(abilityChecks, proficiencies, proficiencyBonus);

        const classFeats = await this.collectClassFeatures(classes);

        return {
            ...character,
            proficiencyBonus,
            abilityBonusProviders,
            proficiencies,
            abilityScores,
            abilityChecks,
            savingThrows,
            skills,
            speed: race?.speed ?? NaN,
            passivePerception: 10 + skills.Perception,
            initiative: abilityChecks.Dexterity + proficiencies.initiativeBonus
                .map(prof => prof.item)
                .reduce((a, b) => a + b, 0),
            armorClass: (armor?.armorClass ?? 10) + abilityChecks.Dexterity,
            allFeatures: [
                ...classFeats,
                ...this.getFeaturesOf(race),
                ...this.getFeaturesOf(character),
                ...this.getFeaturesOf(background)
            ]
        }
    }

    private calculateProficiencyBonus(character: Character) {
        const levels = character.class
            .map(({ level }) => level)
            .reduce((a, b) => a + b, 0);

        return 1 + Math.ceil(levels / 4);
    }

    private buildRecord<Key extends string, Value>(props: { from: readonly Key[], getValue(key: Key): Value }): { [key in Key]: Value }
    private buildRecord<Index, Key extends string, Value>(props: { from: readonly Index[], getKey(key: Index): Key, getValue(key: Index): Value }): { [key in Key]: Value }
    private buildRecord<Index, Key extends string, Value>({ from, getKey = a => a as unknown as Key, getValue }: { from: readonly Index[], getKey?(key: Index): Key, getValue(key: Index): Value }) {
        return Object.fromEntries(from.map(index => [
            getKey(index),
            getValue(index),
        ]))
    }

    private calculateAbilityScores(character: Character, abilityBonus: AbilityBonusProvider[]): AbilityScores {
        return this.buildRecord({
            from: ABILITIES,
            getValue: ability => character.abilityRolls[ability] + abilityBonus
                    .map(item => item.abilityBonus?.[ability])
                    .filter((item): item is number => item != null)
                    .reduce((a, b) => a + b, 0)
        })
    }

    private calculateSavingThrows(abilityChecks: AbilityScores, proficiencies: ProficiencyIndex, proficiencyBonus: number): AbilityScores {
        const savingThrowProficiencies = Object.groupBy(
            proficiencies.savingThrow,
            item => item.type
        );

        const countBonus = (pool: Proficiency<Ability>[] | undefined, ability: Ability) => pool
            ?.filter(({ item }) => item === ability)
            .length ?? 0

        return this.buildRecord({
            from: ABILITIES,
            getValue: ability => abilityChecks[ability] +
                countBonus(savingThrowProficiencies.Proficiency, ability)
                * proficiencyBonus
                * (1 + countBonus(savingThrowProficiencies.Expertise, ability))
        })
    }

    private calculateAbilityChecks(abilityScores: AbilityScores): AbilityScores {
        return this.buildRecord({
            from: ABILITIES,
            getValue: ability => Math.floor(abilityScores[ability] / 2) - 5
        })
    }

    private async collectClassFeatures(classes: ClassDescriptor[]) {
        const collect = async (cls: Class) => {
            return (await this.classRepository.getFeaturesByReference(cls.reference))
                ?.transform(this.errorViewModel.handle(cls.reference, "Features"))
        };
        const classFeatures = (await Promise.all(
            classes.map(async (characterClass) => (await Promise.all(
                [characterClass.class, characterClass.subclass]
                    .filter((item): item is NonNullable<typeof item> => !!item)
                    .flatMap(collect)
            ))
                .flatMap(feats => feats ?? [])
                .filter(feat => feat.for?.level ?? 0 < characterClass.level)))
        ).flatMap(a => a)

        const explicitFeatures = classes.map(characterClass =>
            [characterClass.class, characterClass.subclass].flatMap(provider => this.getFeaturesOf(provider))
        ).flatMap(feat => feat)

        classFeatures.push(...explicitFeatures);

        return classFeatures
    }

    private getFeature(ref: Reference, provider: FeatureProvider)  {
        const feat = this.featureRepository.getByReference(ref)
            ?.transform(this.errorViewModel.handle(ref, "Features"));

        if (!feat) return undefined;

        feat.from = provider.reference;
        return feat;
    }

    private getFeaturesOf(provider: FeatureProvider | undefined) {
        return provider?.features
            .flatMap(ref => this.getFeature(ref, provider))
            .filter((item): item is NonNullable<typeof item> => !!item) ?? []
    }

    private calculateSkills(abilityChecks: AbilityScores, proficiencies: ProficiencyIndex, proficiencyBonus: number): SkillScores {
        const skillProficiencies = Object.groupBy(
            proficiencies.skill,
            item => item.type
        );

        const countBonus = (pool: Proficiency<Skill>[] | undefined, skill: Skill) => pool
            ?.filter(({ item }) => item === skill)
            .length ?? 0

        return this.buildRecord({
            from: ABILITIES.flatMap((ability) => SKILLS[ability].map(skill => [ability, skill] as const)),
            getKey: ([_, skill]) => skill,
            getValue: ([ability, skill]) => abilityChecks[ability as Ability] +
                countBonus(skillProficiencies.Proficiency, skill)
                * proficiencyBonus
                * (1 + countBonus(skillProficiencies.Expertise, skill))
        })
    }

}