import {MockDataView, MockPage, mocker} from "@tests/mock.test";
import test, {mock} from "node:test";
import {CalculatedCharacter, Character} from "@/model/Character";
import {CharacterRenderController} from "@/controller/CharacterRenderController";
import {CharacterRepository} from "@/repository/CharacterRepository";
import {WeaponRepository} from "@/repository/EquipmentRepository";
import {CharacterLogicController} from "@/controller/CharacterLogicController";
import {ModelErrorContainer, Result} from "@/model/Error";
import assert from "node:assert";
import {ABILITIES, ALL_SKILLS, Skill} from "@/model/Abilities";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {Reference} from "@/model/Dataview";

class TestContext {
    readonly dv = new MockDataView(MockPage.of("Me"));
    readonly characterRepository = mocker.mockRepository(CharacterRepository);
    readonly proficiencyRepository = mocker.mockRepository(WeaponRepository);
    readonly characterLogicController: CharacterLogicController = mocker.mock(CharacterLogicController);
    readonly character: CalculatedCharacter = {
        armorClass: 0, initiative: 0, passivePerception: 0,
        abilityBonusIndex: [],
        abilityChecks: {
            Strength: 0,
            Dexterity: 0,
            Constitution: 0,
            Intelligence: 0,
            Wisdom: 0,
            Charisma: 0
        },
        abilityScores: {
            Strength: 0,
            Dexterity: 0,
            Constitution: 0,
            Intelligence: 0,
            Wisdom: 0,
            Charisma: 0
        },
        proficiencyBonus: 0,
        savingThrows: {
            Strength: 0,
            Dexterity: 0,
            Constitution: 0,
            Intelligence: 0,
            Wisdom: 0,
            Charisma: 0
        },
        skills: {
            Athletics: 0,
            Acrobatics: 0,
            "Sleight of Hand": 0,
            Stealth: 0,
            Arcana: 0,
            History: 0,
            Investigation: 0,
            Nature: 0,
            Religion: 0,
            "Animal Handling": 0,
            Insight: 0,
            Medicine: 0,
            Perception: 0,
            Survival: 0,
            Deception: 0,
            Intimidation: 0,
            Performance: 0,
            Persuasion: 0
        },
        speed: 0,
        reference: new Reference(""),
        class: [],
        race: new Reference(""),
        weapons: [],
        money: {
            platinum: 0,
            gold: 0,
            electrum: 0,
            silver: 0,
            copper: 0
        },
        maxHP: 0,
        abilityRolls: {
            Strength: 0,
            Dexterity: 0,
            Constitution: 0,
            Intelligence: 0,
            Wisdom: 0,
            Charisma: 0
        },
        proficiencies: new ProficiencyIndex(),
        features: [],
        allFeatures: []
    };

    readonly tested = new CharacterRenderController(
        this.dv,
        this.characterRepository,
        this.proficiencyRepository,
        this.characterLogicController
    )

    constructor() {
        this.characterLogicController.calculateCharacter = mock.fn(async (_) => [this.character, new ModelErrorContainer()] as const)
    }

    getErrors() {
        const errorPrefix = "\n> [!failure]";

        const errors = this.dv.span.mock.calls
            .map(call => call.arguments.map(ref => ref.toString()))
            .filter(([ref]) => ref.startsWith(errorPrefix))
            .map(([arg]: string[]) => {
                const [title, ...messageLines] = arg.slice(errorPrefix.length).split("\n").filter(a => a);
                return {
                    title,
                    message: messageLines
                        .map(item => item.replace(/^> /, ""))
                        .join("\n")
                };
            });

        return errors;
    }

}

test("Report error if character doesn't exist", async () => {
    const context = new TestContext();
    context.tested.renderCharacter(new Reference("Me"));
    assert.deepStrictEqual(context.getErrors().length, 1);
    assert.deepStrictEqual(context.dv.table.mock.calls, []);
});

test("Ensure all tables are created", async () => {
    const context = new TestContext();
    context.characterRepository.getByReference = mock.fn(() => Result.ok({ output: context.character }));

    await context.tested.renderCharacter(new Reference("Me"));

    assert.deepStrictEqual(context.getErrors(), []);

    assert.deepStrictEqual(
        context.dv.table.mock.calls.map(call => call.arguments[0]),
        [
            ["Ability", "Score", "Check", "Save", "Affected by"],
            ["Skill", "Score", "From Ability"],
            ["Weapon", "Attack Bonus", "Damage", "Range"]
        ]
    );
});

test("Ensure all ability values are rendered", async () => {
    const context = new TestContext();
    context.characterRepository.getByReference = mock.fn(() => Result.ok({ output: context.character }));

    await context.tested.renderCharacter(new Reference("Me"));

    assert.deepStrictEqual(context.getErrors(), []);

    const [headers, rows] = context.dv.table.mock.calls[0].arguments;

    const numbers = Object.fromEntries(rows.map(([ability, score, check, savingThrow]) => [
        ability,
        { score, check, savingThrow }
    ]));

    assert.deepStrictEqual(numbers, Object.fromEntries(ABILITIES.map(ability => [ability, ({ score: '0', check: '0', savingThrow: '0' })])))
});

test("Ensure skill proficiency justifications are rendered correctly", async () => {
    const context = new TestContext();
    context.characterRepository.getByReference = mock.fn(() => Result.ok({ output: context.character }));
    context.character.proficiencies = new ProficiencyIndex({
        skill: [
            {
                justification: new Reference("Class"),
                item: "Athletics",
                type: "Proficiency",
            },
            {
                justification: new Reference("Race"),
                item: "Athletics",
                type: "Expertise",
            }
        ]
    })

    await context.tested.renderCharacter(new Reference("Me"));

    assert.deepStrictEqual(context.getErrors(), []);

    const [headers, rows] = context.dv.table.mock.calls[1].arguments;

    const justifications = Object.fromEntries(rows.map(([skill, score, fromAbility]) => [
        skill,
        fromAbility
    ]));

    assert.deepStrictEqual(justifications.Athletics, "Strength, [[Class]] (Proficiency), [[Race]] (Expertise)");
});

test("Ensure skills and abilities are rendered correctly", async () => {
    const context = new TestContext();
    context.characterRepository.getByReference = mock.fn(() => Result.ok({ output: context.character }));

    await context.tested.renderCharacter(new Reference("Me"));

    assert.deepStrictEqual(context.getErrors(), []);

    const orderedAbilities = ABILITIES;
    const orderedSkills = ALL_SKILLS.map(a => a);

    orderedSkills.sort();

    const [abilitiesInTable, skillsInTable] = context.dv.table.mock.calls
        .map(({ arguments: [_headers, values] }) => values.map(([descriptor]) => descriptor));

    assert.deepStrictEqual(abilitiesInTable, orderedAbilities);
    assert.deepStrictEqual(skillsInTable, orderedSkills);
});