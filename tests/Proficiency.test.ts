import test from "node:test";
import {MockDataView, MockPage} from "@tests/mock.test";
import {
    ArmorProficiencyRepository, ProficiencyRepository,
    SavingThrowProficiencyRepository,
    ToolProficiencyRepository,
    WeaponProficiencyRepository,
    WeaponTypeProficiencyRepository
} from "@/repository/ProficiencyRepository";
import assert from "node:assert";
import {Repository} from "@/repository/Repository";
import {Proficiency} from "@/model/Proficiency";

const examplePage = MockPage.of("Character.md", {
    "Armor Proficiency": "Light Armor",
    "Weapon Type Proficiency": "simple",
    "Weapon Proficiency": ["Hand Crossbow", "Longbow", "Rapier", "Shortsword"],
    "Tool Proficiency": "Thieve's Tools",
    "Saving Throw Proficiency": ["Dexterity", "Intelligence"],
});

const testOverAttribute = (attribute: keyof typeof examplePage, Repository: new (dv: MockDataView) => Repository<Proficiency<any>[]>) => async () => {

    const dv = new MockDataView(examplePage);

    const tested = new Repository(dv);

    const result = tested.parse(examplePage);

    const { output, warnings } = result.unwrap()

    assert.ok(!warnings);

    assert.ok(output);

    const expectedRaw: unknown = examplePage[attribute]
    let expected: unknown[];
    if (!Array.isArray(expectedRaw)) {
        expected = [expectedRaw];
    } else {
        expected = expectedRaw;
    }

    assert.deepStrictEqual(output, expected.map(item => ({
        item,
        type: "Proficiency",
        justification: { path: "Character.md" },
        property: attribute
    })));

}

test("Fetches saving throw proficiencies from page", testOverAttribute("Saving Throw Proficiency", SavingThrowProficiencyRepository));
test("Fetches armor proficiencies from page", testOverAttribute("Armor Proficiency", ArmorProficiencyRepository));
test("Fetches weapon proficiencies from page", testOverAttribute("Weapon Proficiency", WeaponProficiencyRepository));
test("Fetches weapon type proficiencies from page", testOverAttribute("Weapon Type Proficiency", WeaponTypeProficiencyRepository));
test("Fetches tool proficiencies from page", testOverAttribute("Tool Proficiency", ToolProficiencyRepository));

test("Fails if invalid proficiency", async () => {
    const page = MockPage.of("Character.md", {
        "Saving Throw Proficiency": ["Irrelevant", "Stuff"]
    });

    const dv = new MockDataView(page);

    const tested = new SavingThrowProficiencyRepository(dv);

    const result = tested.parse(page);

    const error = result.unwrapError()

    assert.deepStrictEqual(
        error.issues.map(issue => issue.path.join(".")),
        ["Saving Throw Proficiency"]
    )
});

test("Fetches all proficiencies", async () => {
    const dv = new MockDataView(examplePage);

    const tested = new ProficiencyRepository(dv);

    const result = tested.parse(examplePage);

    const { output, warnings } = result.unwrap();

    assert.ok(!warnings);

    assert.ok(output);

    assert.deepStrictEqual(
        new Set(output),
        new Set(Object.entries(examplePage)
            .filter(([key]) => key != "file")
            .flatMap(([property, value]) => (Array.isArray(value)? value : [value]).map(item => ({
                item,
                type: "Proficiency",
                justification: { path: "Character.md" },
                property,
            }))))
    )
})