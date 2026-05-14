import {Reference, DataView} from "@/model/Dataview";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {CalculatedCharacter, Character} from "@/model/Character";
import {ModelErrorContainer} from "@/model/Error";
import {ABILITIES, Ability, AbilityBonusIndex, AbilityScores, Skill, SKILLS, SkillScores} from "@/model/Abilities";
import {AbilityBonusRepository} from "@/repository/AbilityRepository";
import {
    ProficiencyRepository
} from "@/repository/ProficiencyRepository";
import {RaceRepository} from "@/repository/RaceRepository";
import {Controller} from "@/controller/Controller";

export class CharacterLogicController extends Controller {

    constructor(
        dv: DataView,
        private readonly abilityBonusRepository = new AbilityBonusRepository(dv),
        private readonly proficiencyRepository = new ProficiencyRepository(dv),
        private readonly raceRepository = new RaceRepository(dv),
    ) {
        super(dv);
    }

    calculateCharacter(character: Character): [CalculatedCharacter, ModelErrorContainer] {
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
        const speed = race?.speed ?? NaN;

        return [{
            ...character,
            proficiencyBonus,
            abilityBonusIndex,
            proficiencies,
            abilityScores,
            abilityChecks,
            savingThrows,
            skills,
            speed
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