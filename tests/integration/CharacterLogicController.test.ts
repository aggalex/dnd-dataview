import test from "node:test";
import {Character} from "@/model/Character";
import {CharacterLogicController} from "@/controller/CharacterLogicController";
import {MockDataView, MockPage} from "@tests/mock.test";
import assert from "node:assert";
import {ABILITIES, AbilityScores, Skill, SKILLS} from "@/model/Abilities";
import {Proficiency} from "@/model/Proficiency";

const baseCharacter: Character = {
    abilityRolls: {
        Strength: 12,
        Dexterity: 13,
        Constitution: 14,
        Intelligence: 11,
        Wisdom: 8,
        Charisma: 10
    },
    class: [{
        class: "Fighter",
        level: 4,
    }],
    maxHP: 0,
    money: {
        gold: 0,
        silver: 0,
        platinum: 0,
        electrum: 0,
        copper: 0
    },
    proficiencies: [],
    race: "Loxodon",
    reference: "Me",
    weapons: []
};

test("Ensure skills and abilities are calculated correctly", async () => {
    const character: Character = Object.create(baseCharacter);

    const dv = new MockDataView(MockPage.of(character.reference as string));
    const logicController = new CharacterLogicController(dv);

    const [calculatedCharacter, modelErrorController] = logicController.calculateCharacter(character);

    const errors = modelErrorController.getErrors();
    assert.deepStrictEqual(errors, []);

    const expectedChecks: AbilityScores = {
        Strength: 1,
        Dexterity: 1,
        Constitution: 2,
        Intelligence: 0,
        Wisdom: -1,
        Charisma: 0
    };

    assert.deepStrictEqual(calculatedCharacter.abilityScores, character.abilityRolls);
    assert.deepStrictEqual(calculatedCharacter.abilityChecks, expectedChecks);
    assert.deepStrictEqual(calculatedCharacter.savingThrows, expectedChecks);
});

test("Ensure ability bonuses are considered skills and abilities are calculated correctly", async () => {
    const character: Character = Object.create(baseCharacter);

    const race = MockPage.of("Loxodon", {
        Strength: 1,
        Constitution: 2,
        Speed: 30,
        Size: "Medium"
    })

    const cls = MockPage.of("Fighter", {
        Strength: 1,
    })

    const dv = new MockDataView(MockPage.of(character.reference as string));
    dv.addPage(race);
    dv.addPage(cls);

    const logicController = new CharacterLogicController(dv);

    const [calculatedCharacter, modelErrorController] = logicController.calculateCharacter(character);

    const errors = modelErrorController.getErrors();
    assert.deepStrictEqual(errors, []);

    const expectedChecks: AbilityScores = {
        Strength: 2,
        Dexterity: 1,
        Constitution: 3,
        Intelligence: 0,
        Wisdom: -1,
        Charisma: 0
    };

    const expectedAbilities = {
        ...character.abilityRolls,
        Strength: race.Strength + cls.Strength + character.abilityRolls.Strength,
        Constitution: race.Constitution + character.abilityRolls.Constitution,
    };

    assert.deepStrictEqual(calculatedCharacter.abilityScores, expectedAbilities);
    assert.deepStrictEqual(calculatedCharacter.abilityChecks, expectedChecks);
    assert.deepStrictEqual(calculatedCharacter.savingThrows, expectedChecks);
    assert.deepStrictEqual(new Set(calculatedCharacter.abilityBonusIndex), new Set([
        {
            Strength: 1,
            justification: cls.file.link
        },
        {
            Strength: 1,
            Constitution: 2,
            justification: race.file.link
        }
    ]));
});

test("Ensure proficiencies are considered skills and abilities are calculated correctly", async () => {
    const character: Character = Object.create(baseCharacter);

    const race = MockPage.of("Loxodon", {
        "Skill Proficiency": ["Intimidation", "Survival"],
        "Skill Expertise": "Intimidation",
        "Saving Throw Proficiency": "Strength",
        Speed: 30,
        Size: "Medium"
    })

    const cls = MockPage.of("Fighter", {
        "Skill Proficiency": "Athletics",
        "Initiative Bonus": 2,
    })

    const dv = new MockDataView(MockPage.of(character.reference as string));
    dv.addPage(race);
    dv.addPage(cls);

    const logicController = new CharacterLogicController(dv);

    const [calculatedCharacter, modelErrorController] = logicController.calculateCharacter(character);

    const errors = modelErrorController.getErrors();
    assert.deepStrictEqual(errors, []);

    const expectedChecks: AbilityScores = {
        Strength: 1,
        Dexterity: 1,
        Constitution: 2,
        Intelligence: 0,
        Wisdom: -1,
        Charisma: 0
    };

    const expectedSavingThrows = {
        ...expectedChecks,
        Strength: expectedChecks.Strength + 2
    };

    const expectedSkills = Object.fromEntries(
        ABILITIES
        .flatMap(ability => SKILLS[ability].map(skill => [skill, expectedChecks[ability]]))
    ) as { [k in Skill]: number };

    expectedSkills.Intimidation += 4;
    expectedSkills.Athletics += 2;
    expectedSkills.Survival += 2;

    const expectedAbilities = character.abilityRolls;

    assert.equal(calculatedCharacter.proficiencyBonus, 2);
    assert.deepStrictEqual(calculatedCharacter.abilityScores, expectedAbilities);
    assert.deepStrictEqual(calculatedCharacter.abilityChecks, expectedChecks);
    assert.deepStrictEqual(calculatedCharacter.savingThrows, expectedSavingThrows);
    assert.deepStrictEqual(calculatedCharacter.skills, expectedSkills);

    assert.deepStrictEqual(new Set(calculatedCharacter.proficiencies), new Set([
        {
            justification: race.file.link,
            item: "Intimidation",
            type: "Proficiency",
            property: "Skill Proficiency",
        },
        {
            justification: race.file.link,
            item: "Survival",
            type: "Proficiency",
            property: "Skill Proficiency",
        },
        {
            justification: cls.file.link,
            item: "Athletics",
            type: "Proficiency",
            property: "Skill Proficiency",
        },
        {
            justification: race.file.link,
            item: "Intimidation",
            type: "Expertise",
            property: "Skill Expertise",
        },
        {
            justification: race.file.link,
            item: "Strength",
            type: "Proficiency",
            property: "Saving Throw Proficiency",
        },
        {
            justification: cls.file.link,
            item: 2,
            type: "Proficiency",
            property: "Initiative Bonus",
        }
    ] as Proficiency<unknown>[]));
});