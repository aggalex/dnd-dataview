import test from "node:test";
import {MockDataView, MockPage} from "@tests/mock.test";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import assert from "node:assert";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";

const examplePage = MockPage.of("Character.md", {
    "Armor Proficiency": "Light Armor",
    "Weapon Type Proficiency": "simple",
    "Weapon Proficiency": ["Hand Crossbow", "Longbow", "Rapier", "Shortsword"],
    "Tool Proficiency": "Thieve's Tools",
    "Saving Throw Proficiency": ["Dexterity", "Intelligence"],
});

test("Fetches proficiencies from pagee", async () => {

    const dv = new MockDataView(examplePage);

    const tested = new ProficiencyRepository(dv);

    const result = tested.parse(examplePage);

    const { output, warnings } = result.unwrap()

    assert.ok(!warnings);

    assert.ok(output);

    const getProficiencyArray = (attribute: keyof typeof examplePage) => {
        const expectedRaw: unknown = examplePage[attribute]
        if (!Array.isArray(expectedRaw)) {
            return [expectedRaw];
        } else {
            return  expectedRaw;
        }
    }

    const buildProficiency = <Key extends keyof typeof examplePage>(
        key: Key,
        type: Proficiency<unknown>["type"] = "Proficiency"
    ): Proficiency<any>[] => getProficiencyArray(key).map(item => ({
        item,
        justification: { path: "Character.md" },
        type,
    }));

    const expected: ProficiencyIndex = new ProficiencyIndex({
        savingThrow: buildProficiency("Saving Throw Proficiency"),
        weaponType: buildProficiency("Weapon Type Proficiency"),
        weapon: buildProficiency("Weapon Proficiency"),
        tool: buildProficiency("Tool Proficiency"),
        armor: buildProficiency("Armor Proficiency")
    });

    assert.deepStrictEqual(output, expected);

});