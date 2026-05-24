import {DataView, Reference} from "@/model/Dataview";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {CalculatedCharacter, Character} from "@/model/Character";
import {ModelError, ModelErrorContainer} from "@/model/Error";
import {ABILITIES, Ability, AbilityBonusIndex, AbilityScores, Skill, SKILLS, SkillScores} from "@/model/Abilities";
import {AbilityBonusRepository} from "@/repository/AbilityRepository";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {RaceRepository} from "@/repository/RaceRepository";
import {Controller} from "@/controller/Controller";
import {ArmorRepository} from "@/repository/EquipmentRepository";
import {FeatureProviderRepository, FeatureRepository} from "@/repository/FeatureRepository";
import {ClassRepository} from "@/repository/ClassRepository";
import {BackgroundRepository} from "@/repository/BackgroundRepository";
import {Feature, FeatureProvider} from "@/model/Feature";

export class CharacterLogicController extends Controller {

    constructor(
        dv: DataView,
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

    async calculateCharacter(character: Character): Promise<[CalculatedCharacter, ModelErrorContainer]> {
        const errors = new ModelErrorContainer();

        const proficiencyBonus = this.calculateProficiencyBonus(character);

        const bonusProviders = this.getBonusProviders(character);
        const proficiencies = new ProficiencyIndex(...bonusProviders
            .map(ref => {
                const res = this.proficiencyRepository.getByReference(ref);
                return res && errors.addModelErrors(res, ref, "Proficiency")
            })
            .filter((res): res is ProficiencyIndex => !!res))

        const [abilityBonusIndex, bonusIndexErrors] = this.calculateAbilityBonuses(bonusProviders);
        errors.addAll(bonusIndexErrors);

        const abilityScores = this.calculateAbilityScores(character, abilityBonusIndex);
        const abilityChecks = this.calculateAbilityChecks(abilityScores);
        const savingThrows = this.calculateSavingThrows(abilityChecks, proficiencies, proficiencyBonus);
        const skills = this.calculateSkills(abilityChecks, proficiencies, proficiencyBonus);

        const raceRes = this.raceRepository.getByReference(character.race);
        const race = raceRes && errors.addModelErrors(raceRes, character.race, "Race");

        const backgroundRes = character.background && this.backgroundRepository.getByReference(character.background);
        const background = backgroundRes? errors.addModelErrors(backgroundRes, character.background!, "Background") : undefined;

        const armorRes = character.armor && this.armorRepository.getByReference(character.armor);
        const armor = armorRes && character.armor? errors.addModelErrors(armorRes, character.armor, "Armor") : undefined;

        const [classFeats, featErrors] = await this.collectClassFeatures(character);
        errors.addAll(featErrors);

        return [{
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
                ...this.getFeaturesOf(race, errors),
                ...this.getFeaturesOf(character, errors),
                ...this.getFeaturesOf(background, errors)
            ]
        }, errors]
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

    private calculateAbilityBonuses(bonusProviders: Reference[]): [AbilityBonusIndex[], ModelErrorContainer] {
        const errors = new ModelErrorContainer();

        const abilityBonuses = bonusProviders
            .map(ref => {
                const res = this.abilityBonusRepository.getByReference(ref);
                return res && errors.addModelErrors(res, ref, "Ability Scores");
            })
            .filter((res): res is AbilityBonusIndex => !!res)
            .filter(res => {
                const keys = Object.entries(res)
                    .filter(([key, value]) => value !== 0)
                    .map(([key]) => key);

                return !(keys.length === 1 && keys[0] === "justification")
            });

        return [abilityBonuses, errors];
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
        const errors = new ModelErrorContainer();

        const collect = async (ref: Reference) => {
            const featRefs = errors.addModelErrors(await this.classRepository.getFeaturesByReferenceAndLevel(ref), ref, "Features");

            return featRefs?.map(perLevel => perLevel
                .map(ref => this.getFeature(ref, errors))
                .filter((a): a is NonNullable<typeof a> => !!a)) ?? [];
        };
        const classFeatures = (await Promise.all(
            character.class.map(async (characterClass) => (await Promise.all(
                [characterClass.class, characterClass.subclass]
                    .filter((item): item is NonNullable<typeof item> => !!item)
                    .map(collect)))
                    .filter((_, index) => characterClass.level >= index)
                    .flatMap(feats => feats)
                    .flatMap(feats => feats)
            )
        )).flatMap(feats => feats);

        const explicitFeatures = character.class.map(characterClass =>
            [characterClass.class, characterClass.subclass]
                .filter((item): item is NonNullable<typeof item> => !!item)
                .map(ref => {
                    const res = this.featureProviderRepository.getByReference(ref);
                    if (!res) return undefined;
                    return errors.addModelErrors(res, ref, "Features");
                })
                .filter((item): item is NonNullable<typeof item> => !!item)
                .flatMap(provider => this.getFeaturesOf(provider, errors))
        ).flatMap(feat => feat)

        classFeatures.push(...explicitFeatures);

        return [classFeatures, errors] as const;
    }

    private getFeature(ref: Reference, errors: ModelErrorContainer)  {
        const res = this.featureRepository.getByReference(ref);
        if (!res) return undefined;
        const feat = errors.addModelErrors(res, ref, "Features");
        if (!feat) return undefined;
        feat.from = ref;
        return feat;
    }

    private getFeaturesOf(provider: FeatureProvider | undefined, errorContainer: ModelErrorContainer) {
        return provider?.features
            .flatMap(ref => this.getFeature(ref, errorContainer))
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