import test from "node:test";
import {MockDataView, MockPage} from "@tests/mock.test";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import assert from "node:assert";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {Reference} from "@/model/Dataview";

const examplePage = MockPage.of("Character.md", {
    "Armor Proficiency": "Light Armor",
    "Weapon Type Proficiency": "simple",
    "Weapon Proficiency": ["Hand Crossbow", "Longbow", "Rapier", "Shortsword"],
    "Tool Proficiency": "Thieve's Tools",
    "Saving Throw Proficiency": ["Dexterity", "Intelligence"],
});

test("Fetches proficiencies from page", async () => {

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
        itemMapper = (item: any) => item
    ): Proficiency<any>[] => getProficiencyArray(key).map(item => ({
        item: itemMapper(item),
        justification: new Reference("Character.md"),
        type: "Proficiency",
    }));

    const expected: ProficiencyIndex = new ProficiencyIndex({
        savingThrow: buildProficiency("Saving Throw Proficiency"),
        weaponType: buildProficiency("Weapon Type Proficiency"),
        weapon: buildProficiency("Weapon Proficiency", Reference.from),
        tool: buildProficiency("Tool Proficiency", Reference.from),
        armor: buildProficiency("Armor Proficiency"),
    });

    assert.deepStrictEqual(output, expected);

});