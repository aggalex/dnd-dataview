import {DataView, Reference} from "@/model/Dataview";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {CalculatedCharacter, Character} from "@/model/Character";
import {ABILITIES, Ability, AbilityBonusIndex, AbilityScores, Skill, SKILLS, SkillScores} from "@/model/Abilities";
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
    ) {
        super(dv);
    }

    async calculateCharacter(character: Character): Promise<CalculatedCharacter> {

        const proficiencyBonus = this.calculateProficiencyBonus(character);

        const bonusProviders = this.getBonusProviders(character);
        const proficiencies = new ProficiencyIndex(...bonusProviders
            .map(ref => this.proficiencyRepository.getByReference(ref)
                    ?.transform(this.errorViewModel.handle(ref, "Proficiency")))
            .filter((res): res is ProficiencyIndex => !!res))

        const abilityBonusIndex = this.calculateAbilityBonuses(bonusProviders);
        const abilityScores = this.calculateAbilityScores(character, abilityBonusIndex);
        const abilityChecks = this.calculateAbilityChecks(abilityScores);
        const savingThrows = this.calculateSavingThrows(abilityChecks, proficiencies, proficiencyBonus);
        const skills = this.calculateSkills(abilityChecks, proficiencies, proficiencyBonus);

        const race = this.raceRepository.getByReference(character.race)
            ?.transform(this.errorViewModel.handle(character.race, "Race"));

        const background = character.background && this.backgroundRepository.getByReference(character.background)
            ?.transform(this.errorViewModel.handle(character.background, "Background"));

        const armor = character.armor && this.armorRepository.getByReference(character.armor)
            ?.transform(this.errorViewModel.handle(character.armor, "Armor"));

        const classFeats = await this.collectClassFeatures(character);

        return {
            ...character,
            proficiencyBonus,
            abilityBonusIndex,
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

    private getBonusProviders(character: Character): Reference[] {
        return [
            ...character.class
                .flatMap(cls => [cls.class, cls.subclass])
                .filter((a): a is Reference => !!a),
            ...[character.background].filter((a): a is Reference => !!a),
            character.reference,
            character.race
        ].filter((ref): ref is Reference => !!ref)
    }

    private calculateProficiencyBonus(character: Character) {
        const levels = character.class
            .map(({ level }) => level)
            .reduce((a, b) => a + b, 0);

        return 1 + Math.ceil(levels / 4);
    }

    private calculateAbilityBonuses(bonusProviders: Reference[]): AbilityBonusIndex[] {
        return bonusProviders
            .map(ref => this.abilityBonusRepository.getByReference(ref)
                ?.transform(this.errorViewModel.handle(ref, "Ability Scores")))
            .filter((res): res is AbilityBonusIndex => !!res)
            .filter(res => {
                const keys = Object.entries(res)
                    .filter(([key, value]) => value !== 0)
                    .map(([key]) => key);

                return !(keys.length === 1 && keys[0] === "justification")
            });
    }

    private buildRecord<Key extends string, Value>(props: { from: readonly Key[], getValue(key: Key): Value }): { [key in Key]: Value }
    private buildRecord<Index, Key extends string, Value>(props: { from: readonly Index[], getKey(key: Index): Key, getValue(key: Index): Value }): { [key in Key]: Value }
    private buildRecord<Index, Key extends string, Value>({ from, getKey = a => a as unknown as Key, getValue }: { from: readonly Index[], getKey?(key: Index): Key, getValue(key: Index): Value }) {
        return Object.fromEntries(from.map(index => [
            getKey(index),
            getValue(index),
        ]))
    }

    private calculateAbilityScores(character: Character, abilityBonuses: AbilityBonusIndex[]): AbilityScores {
        return this.buildRecord({
            from: ABILITIES,
            getValue: ability => character.abilityRolls[ability] + abilityBonuses
                    .map(item => item[ability])
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

    private async collectClassFeatures(character: Character) {
        const collect = async (ref: Reference) => {
            const featRefs = (await this.classRepository.getFeaturesByReference(ref))
                ?.transform(this.errorViewModel.handle(ref, "Features"));

            return featRefs
        };
        const classFeatures = (await Promise.all(
            character.class.map(async (characterClass) => (await Promise.all(
                [characterClass.class, characterClass.subclass]
                    .filter((item): item is NonNullable<typeof item> => !!item)
                    .flatMap(collect)
            ))
                .flatMap(feats => feats ?? [])
                .filter(feat => feat.for?.level ?? 0 < characterClass.level)))
        ).flatMap(a => a)

        const explicitFeatures = character.class.map(characterClass =>
            [characterClass.class, characterClass.subclass]
                .filter((item): item is NonNullable<typeof item> => !!item)
                .map(ref => this.featureProviderRepository.getByReference(ref)
                    ?.transform(this.errorViewModel.handle(ref, "Features"))
                )
                .filter((item): item is NonNullable<typeof item> => !!item)
                .flatMap(provider => this.getFeaturesOf(provider))
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