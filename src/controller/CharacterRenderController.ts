import {RenderController} from "@/controller/RenderController";
import {Reference, DataView} from "@/model/Dataview";
import {CharacterRepository} from "@/repository/CharacterRepository";
import {CalculatedCharacter} from "@/model/Character";
import {ModelError, ModelErrorContainer} from "@/model/Error";
import {WeaponRepository} from "@/repository/EquipmentRepository";
import {Table} from "@/model/render/Table";
import {Weapon} from "@/model/Equipment";
import {
    ABILITIES,
    SKILLS,
} from "@/model/Abilities";
import {
    SkillExpertiseRepository,
    SkillProficiencyRepository
} from "@/repository/ProficiencyRepository";
import {Proficiency} from "@/model/Proficiency";
import {Tag} from "@/model/render/Tag";
import {Container} from "@/model/render/Container";
import {CharacterLogicController} from "@/controller/CharacterLogicController";
import {StringUtil} from "@/util";

export class CharacterRenderController extends RenderController {

    constructor(
        dv: DataView,
        private readonly characterRepository = new CharacterRepository(dv),
        private readonly weaponRepository = new WeaponRepository(dv),
        private readonly skillProficiencyRepository = new SkillProficiencyRepository(dv),
        private readonly skillExpertiseRepository = new SkillExpertiseRepository(dv),
        private readonly characterLogicController = new CharacterLogicController(dv)
    ) {
        super(dv);
    }


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

        const [calculatedCharacter, calculationErrors] = this.characterLogicController.calculateCharacter(character);
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

    private getReferenceString(ref: Proficiency<unknown>[]) {
        return ref.map(ref => `${this.getLinkString(ref.justification)} (${ref.type})`).join(', ');
    }

    private getLinkString(ref: Reference) {
        if (typeof ref === "string") {
            return `[[${ref}]]`
        } else {
            return `${ref}`
        }
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
                this.getLinkString(reference),
                this.signed(attack),
                damage ?? "",
                reach ? reach + (range ? ` (${range})` : "") : range ?? ""
            ] as const)

        return [
            new Table(["Weapon", "Attack Bonus", "Damage", "Range"] as const, weaponRows),
            errors
        ];
    }

    private getSkillsTable(character: CalculatedCharacter): Table {
        const proficiencies = character.proficiencies
            .filter(prof => this.skillProficiencyRepository.isType(prof) || this.skillExpertiseRepository.isType(prof));

        const proficienciesPerSkill = Object.groupBy(proficiencies, item => item.item);

        const skillRows = Object.entries(SKILLS)
            .flatMap(([ability, skills]) => skills.map(skill => [
                skill,
                this.signed(character.skills[skill]),
                `${ability}, ${this.getReferenceString(proficienciesPerSkill[skill] ?? [])}`
            ] as const));

        skillRows.sort(([a], [b]) => StringUtil.compare(a, b))

        return new Table(["Skill", "Score", "From Ability"] as const, skillRows);
    }

    private getAbilityTable(character: CalculatedCharacter): Table {
        const abilityJustifications = Object.fromEntries(ABILITIES.map(ability => [
            ability,
            character.abilityBonusIndex.filter(abilityBonus => ability in abilityBonus && abilityBonus[ability] !== 0)
                .map(abilityBonus => `${abilityBonus.justification}`)
                .join(", ")
        ]))

        const abilityRows = ABILITIES.map(ability => [
            ability,
            character.abilityScores[ability] + "",
            this.signed(character.abilityChecks[ability]),
            this.signed(character.savingThrows[ability]),
            abilityJustifications[ability]
        ] as const);

        abilityRows.sort(([a], [b]) => StringUtil.compare(a, b))

        return new Table(["Ability", "Score", "Check", "Save", "Affected by"] as const, abilityRows);
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