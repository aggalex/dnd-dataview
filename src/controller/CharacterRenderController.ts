import {RenderController} from "@/controller/RenderController";
import {Reference} from "@/model/Dataview";
import {CharacterRepository} from "@/repository/CharacterRepository";
import {CalculatedCharacter, Character} from "@/model/Character";
import {ModelError, ModelErrorContainer} from "@/model/Error";
import {WeaponRepository} from "@/repository/EquipmentRepository";
import {Table} from "@/model/render/Table";
import {Weapon} from "@/model/Equipment";
import {
    ABILITIES,
    Ability,
    AbilityBonusIndex,
    AbilityScores,
    Skill,
    SKILLS,
    SkillScores
} from "@/model/Abilities";
import {
    ProficiencyRepository,
    SavingThrowProficiencyRepository, SkillExpertiseRepository,
    SkillProficiencyRepository
} from "@/repository/ProficiencyRepository";
import {AbilityBonusRepository} from "@/repository/AbilityRepository";
import {Proficiency} from "@/model/Proficiency";
import {RaceRepository} from "@/repository/RaceRepository";
import {Tag} from "@/model/render/Tag";
import {Container} from "@/model/render/Container";

export class CharacterRenderController extends RenderController {
    private readonly characterRepository = new CharacterRepository(this.dv);
    private readonly weaponRepository = new WeaponRepository(this.dv);
    private readonly abilityBonusRepository = new AbilityBonusRepository(this.dv);
    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);
    private readonly savingThrowProficiencyRepository = new SavingThrowProficiencyRepository(this.dv);
    private readonly skillProficiencyRepository = new SkillProficiencyRepository(this.dv);
    private readonly skillExpertiseRepository = new SkillExpertiseRepository(this.dv);
    private readonly raceRepository = new RaceRepository(this.dv);

    renderCharacter(ref?: Reference) {
        ref = ref ?? this.dv.current().file.link

        const errors = new ModelErrorContainer();

        const characterRes = this.characterRepository.getByReference(ref);
        if (!characterRes) {
            errors.add(new ModelError({
                level: "Error",
                message: `Character ${ref} does not exist`,
                section: "Character",
                title: "Character not found"
            }));
            this.renderErrors(errors);
            return;
        }

        const character = errors.addModelErrors(characterRes, ref, "Character");

        if (!character) {
            this.renderErrors(errors);
            return;
        }

        const [calculatedCharacter, calculationErrors] = this.calculateCharacter(character);
        errors.addAll(calculationErrors);

        const state = this.getState(calculatedCharacter);
        const abilities = this.getAbilityTable(calculatedCharacter);
        const skills = this.getSkillsTable(calculatedCharacter);
        const [weapons, weaponErrors] = this.getWeapons(calculatedCharacter);
        
        weaponErrors.addAll(weaponErrors);
        
        this.renderErrors(errors);

        new Container([
            ...state,
            abilities,
            skills,
            weapons
        ]).renderIn(this.dv);
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

    private calculateCharacter(character: Character): [CalculatedCharacter, ModelErrorContainer] {
        const errors = new ModelErrorContainer();

        const proficiencyBonus = this.calculateProficiencyBonus(character);

        const bonusProviders = this.getBonusProviders(character);
        const proficiencies = bonusProviders
            .map(ref => {
                const res = this.proficiencyRepository.getByReference(ref);
                return res && errors.addModelErrors(res, ref, "Proficiency")
            })
            .filter((res): res is Proficiency<unknown>[] => !!res)
            .flatMap(a => a)

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
            .filter((res): res is AbilityBonusIndex => !!res);

        return [abilityBonuses, errors];
    }

    private calculateAbilityScores(character: Character, abilityBonuses: AbilityBonusIndex[]): AbilityScores {
        return Object.fromEntries(ABILITIES.map(ability => [
            ability,
            character.abilityRolls[ability] + abilityBonuses
                .map(item => item[ability])
                .filter((item): item is number => item != null)
                .reduce((a, b) => a + b, 0)
        ])) as AbilityScores
    }

    private calculateSavingThrows(abilityChecks: AbilityScores, proficiencies: Proficiency<unknown>[], proficiencyBonus: number): AbilityScores {
        const savingThrowProficiencies = Object.groupBy(
            proficiencies.filter(item => this.savingThrowProficiencyRepository.isType(item)),
            item => item.type
        );

        const countBonus = (pool: Proficiency<Ability>[] | undefined, ability: Ability) => pool
            ?.filter(({ item }) => item === ability)
            .length ?? 0

        return Object.fromEntries(ABILITIES.map(ability => [
            ability,
            abilityChecks[ability] +
                countBonus(savingThrowProficiencies.Proficiency, ability)
                * proficiencyBonus
                * (1 + countBonus(savingThrowProficiencies.Expertise, ability))
        ])) as AbilityScores
    }

    private calculateAbilityChecks(abilityScores: AbilityScores): AbilityScores {
        return Object.fromEntries(ABILITIES.map(ability => [
            ability,
            Math.floor(abilityScores[ability] / 2) - 5
        ])) as AbilityScores
    }

    private calculateSkills(abilityChecks: AbilityScores, proficiencies: Proficiency<unknown>[], proficiencyBonus: number): SkillScores {
        const skillProficiencies = {
            Proficiency: proficiencies.filter(item => this.skillProficiencyRepository.isType(item)),
            Expertise: proficiencies.filter(item => this.skillExpertiseRepository.isType(item)),
        }

        const countBonus = (pool: Proficiency<Skill>[] | undefined, skill: Skill) => pool
            ?.filter(({ item }) => item === skill)
            .length ?? 0

        return Object.fromEntries(Object.entries(SKILLS).map(([ability, skillArray]) => skillArray.map(skill => [
            skill,
            abilityChecks[ability as Ability] +
                countBonus(skillProficiencies.Proficiency, skill)
                * proficiencyBonus
                * (1 + countBonus(skillProficiencies.Expertise, skill))
        ])));
    }

    private getReferenceString(ref: Proficiency<unknown>[]) {
        return ref.map(ref => `[[${ref.justification}]] (${ref.type})`).join(', ');
    }

    private getWeapons(character: CalculatedCharacter): [Table, ModelErrorContainer] {
        const errors = new ModelErrorContainer();
        const weapons = character.weapons
            .map(ref => {
                const res = this.weaponRepository.getByReference(ref);
                return res && errors.addModelErrors(res, ref, "Weapon > " + ref);
            })
            .filter((res): res is Weapon => res != null)

        const weaponRows = weapons
            .map(({reference, attack, damage, reach, range}) => [
                `[[${reference}]]`,
                this.signed(attack),
                damage ?? "",
                reach ? reach + (range ? ` (${range})` : "") : range ?? ""
            ] as [string, string, string, string])

        return [
            new Table(["Weapon", "Attack Bonus", "Damage", "Range"], weaponRows),
            errors
        ];
    }

    private getSkillsTable(character: CalculatedCharacter): Table {
        const proficiencies = character.proficiencies
            .filter(prof => this.skillProficiencyRepository.isType(prof) || this.skillExpertiseRepository.isType(prof));

        const proficienciesPerSkill = Object.groupBy(proficiencies, item => item.item);

        const skillRows = Object.entries(SKILLS).flatMap(([ability, skills]) => skills.map(skill => [
            skill,
            this.signed(character.skills[skill]),
            `${[ability, ...this.getReferenceString(proficienciesPerSkill[skill] ?? [])]}`
        ]) as [string, string, string][]);

        return new Table(["Skill", "Score", "From Ability"], skillRows);
    }

    private getAbilityTable(character: CalculatedCharacter): Table {
        const abilityJustifications = Object.fromEntries(ABILITIES.map(ability => [
            ability,
            character.abilityBonusIndex.filter(abilityBonus => ability in abilityBonus && abilityBonus[ability] !== 0)
                .map(abilityBonus => `[[${abilityBonus.justification}]]`)
                .join(", ")
        ]))

        const abilityRows = ABILITIES.map(ability => [
            ability,
            character.abilityScores[ability] + "",
            this.signed(character.abilityChecks[ability]),
            this.signed(character.savingThrows[ability]),
            abilityJustifications[ability]
        ]);

        return new Table(["Ability", "Score", "Check", "Save", "Affected by"], abilityRows);
    }

    private getState(character: CalculatedCharacter): Tag[] {
        const state = {
            Speed: character.speed,
            AC: 0,
            "Passive Perception": 0,
            Initiative: 0,
        }

        return Object.entries(state)
            .map(([key, value]) => new Tag(key, value));
    }

}