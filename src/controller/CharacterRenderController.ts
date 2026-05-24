import {RenderController} from "@/controller/RenderController";
import {Reference, DataView, getPath} from "@/model/Dataview";
import {CharacterRepository} from "@/repository/CharacterRepository";
import {CalculatedCharacter} from "@/model/Character";
import {ModelError} from "@/model/Error";
import {WeaponRepository} from "@/repository/EquipmentRepository";
import {Table} from "@/model/render/Table";
import {Weapon} from "@/model/Equipment";
import {
    ABILITIES,
    SKILLS,
} from "@/model/Abilities";
import {Proficiency} from "@/model/Proficiency";
import {Tag} from "@/model/render/Tag";
import {Container} from "@/model/render/Container";
import {CharacterLogicController} from "@/controller/CharacterLogicController";
import {StringUtil} from "@/util";
import {Section} from "@/model/render/Section";
import {Embedding} from "@/model/render/Embeding";
import {ErrorViewModel} from "@/viewModel/ErrorViewModel";

export class CharacterRenderController extends RenderController {

    constructor(
        dv: DataView,
        errorViewModel: ErrorViewModel = new ErrorViewModel(),
        private readonly characterLogicController = new CharacterLogicController(dv, errorViewModel),
        private readonly characterRepository = new CharacterRepository(dv),
        private readonly weaponRepository = new WeaponRepository(dv),
    ) {
        super(dv, errorViewModel);
    }

    async renderCharacter(ref?: Reference) {
        ref = ref ?? this.dv.current().file.link

        const characterRes = this.characterRepository.getByReference(ref)

        if (!characterRes) {
            this.errorViewModel.errors.add(new ModelError({
                level: "Error",
                message: `Character ${ref} does not exist`,
                section: "Character",
                title: "Character not found"
            }));
            this.renderErrors();
            return;
        }

        const character = characterRes.transform(this.errorViewModel.handle(ref, "Character"));

        if (!character) {
            this.renderErrors();
            return;
        }

        const calculatedCharacter = await this.characterLogicController.calculateCharacter(character);

        const state = this.getState(calculatedCharacter);
        const abilities = this.getAbilityTable(calculatedCharacter);
        const skills = this.getSkillsTable(calculatedCharacter);
        const feats = this.getFeatures(calculatedCharacter);
        const weapons = this.getWeapons(calculatedCharacter);

        this.renderErrors();

        new Container([
            ...state,
            abilities,
            skills,
            weapons,
            feats
        ]).renderIn(this.dv);
    }

    private getReferenceString(ref: Proficiency<unknown>[]) {
        return ref.map(ref => `${ref.justification} (${ref.type})`).join(', ');
    }

    private getWeapons(character: CalculatedCharacter): Table {
        const weapons = character.weapons
            .map(ref => this.weaponRepository.getByReference(ref)
                ?.transform(this.errorViewModel.handle(ref, "Weapons")))
            .filter((res): res is NonNullable<typeof res> => res != null)

        const weaponRows = weapons
            .map(({reference, attack, damage, reach, range}) => [
                reference.toString(),
                this.signed(attack),
                damage ?? "",
                reach ? reach + (range ? ` (${range})` : "") : range ?? ""
            ] as const)

        return new Table(["Weapon", "Attack Bonus", "Damage", "Range"] as const, weaponRows)
    }

    private getSkillsTable(character: CalculatedCharacter): Table {
        const proficiencies = character.proficiencies.skill;

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
            character.abilityBonusProviders
                .filter(({abilityBonus}) => abilityBonus && ability in abilityBonus && abilityBonus[ability] !== 0)
                .map(abilityBonus => `${abilityBonus.reference}`)
                .join(", ")
        ]))

        const abilityRows = ABILITIES.map(ability => [
            ability,
            character.abilityScores[ability] + "",
            this.signed(character.abilityChecks[ability]),
            this.signed(character.savingThrows[ability]),
            abilityJustifications[ability]
        ] as const);

        return new Table(["Ability", "Score", "Check", "Save", "Affected by"] as const, abilityRows);
    }

    private getFeatures(character: CalculatedCharacter) {
        const featureIndex = Object.groupBy(character.allFeatures, feat => feat.from?.name ?? "Unknown");

        return new Section({ header: "Features", level: 2 },
            Object.entries(featureIndex).map(([key, value]) => new Section({ header: "From " + (value?.[0].from?.toString() ?? key), level: 4 },
                value?.map(feat => new Embedding(feat.reference)) ?? []))
        )
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