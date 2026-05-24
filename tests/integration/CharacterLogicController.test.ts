import test from "node:test";
import {Character} from "@/model/Character";
import {CharacterLogicController} from "@/controller/CharacterLogicController";
import {MockDataView, MockPage} from "@tests/mock.test";
import assert from "node:assert";
import {ABILITIES, AbilityScores, Skill, SKILLS} from "@/model/Abilities";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {Reference} from "@/model/Dataview";
import {ErrorViewModel} from "@/viewModel/ErrorViewModel";

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
        class: new Reference("Fighter"),
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
    proficiencies: new ProficiencyIndex(),
    race: new Reference("Loxodon"),
    reference: new Reference("Me"),
    weapons: [],
    features: []
};

test("Ensure skills and abilities are calculated correctly", async () => {
    const character: Character = Object.create(baseCharacter);

    const dv = new MockDataView(MockPage.of(character.reference.path));
    const errorViewModel = new ErrorViewModel();
    const logicController = new CharacterLogicController(dv, errorViewModel);

    const calculatedCharacter = await logicController.calculateCharacter(character);

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
        "Hit Dice": "d6",
        "Initial Hit Dice": 3
    })

    const dv = new MockDataView(MockPage.of(character.reference.path));
    dv.addPage(race);
    dv.addPage(cls);

    const errorViewModel = new ErrorViewModel();

    const logicController = new CharacterLogicController(dv, errorViewModel);

    const calculatedCharacter = await logicController.calculateCharacter(character);

    const errors = errorViewModel.errors.getErrors();
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
    assert.deepStrictEqual(new Set(calculatedCharacter.abilityBonusProviders.map(prov => ({
        justification: prov.reference,
        ...prov.abilityBonus
    }))), new Set([
        {
            Strength: 1,
            justification: Reference.from(Reference.from(cls.file.link))
        },
        {
            Strength: 1,
            Constitution: 2,
            justification: Reference.from(Reference.from(race.file.link))
        }
    ]));
    assert.deepStrictEqual(new Set(calculatedCharacter.abilityBonusProviders
        .flatMap(prov => Object.entries(prov.abilityBonus ?? {}))
        .filter(([_, value]) => value == null)), new Set())
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
        "Hit Dice": "3d6",
        "Initial Hit Dice": 3,
    })

    const dv = new MockDataView(MockPage.of(character.reference.path));
    dv.addPage(race);
    dv.addPage(cls);

    const errorViewModel = new ErrorViewModel();

    const logicController = new CharacterLogicController(dv, errorViewModel);

    const calculatedCharacter = await logicController.calculateCharacter(character);

    const errors = errorViewModel.errors.getErrors();
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

    const expectedProficiencies = new ProficiencyIndex({
        skill: [
            {
                justification: Reference.from(cls.file.link),
                item: "Athletics",
                type: "Proficiency",
            },
            {
                justification: Reference.from(race.file.link),
                item: "Intimidation",
                type: "Proficiency",
            },
            {
                justification: Reference.from(race.file.link),
                item: "Survival",
                type: "Proficiency",
            },
            {
                justification: Reference.from(race.file.link),
                item: "Intimidation",
                type: "Expertise",
            },
        ],
        initiativeBonus: [
            {
                justification: Reference.from(cls.file.link),
                item: 2,
                type: "Proficiency",
            }
        ],
        savingThrow: [
            {
                justification: Reference.from(race.file.link),
                item: "Strength",
                type: "Proficiency",
            },
        ]
    })

    assert.deepStrictEqual(calculatedCharacter.proficiencies, expectedProficiencies);
});

test("Features are collected correctly", async () => {

})