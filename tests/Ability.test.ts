import test from "node:test";
import {MockDataView, MockPage} from "@tests/mock.test";
import {AbilityBonusRepository, AbilityRollRepository} from "@/repository/AbilityRepository";
import assert from "node:assert";
import {ABILITIES} from "@/model/Abilities";

test("Fetches ability rolls from page", async () => {
    const page = MockPage.of("Character.md", {
        "Strength Roll": "10",
        "Dexterity Roll": "10",
        "Constitution Roll": "10",
        "Intelligence Roll": "10",
        "Wisdom Roll": "10",
        "Charisma Roll": "10",
    });

    const dv = new MockDataView(page);

    const tested = new AbilityRollRepository(dv);

    const result = tested.parse(page);

    const { output, warnings } = result.unwrap()

    assert.ok(!warnings);

    assert.ok(output);

    assert.equal(output.Strength, page["Strength Roll"]);
    assert.equal(output.Dexterity, page["Dexterity Roll"]);
    assert.equal(output.Constitution, page["Constitution Roll"]);
    assert.equal(output.Intelligence, page["Intelligence Roll"]);
    assert.equal(output.Wisdom, page["Wisdom Roll"]);
    assert.equal(output.Charisma, page["Charisma Roll"]);
})

test("Warns user if abilities is missing", async () => {
    const page = MockPage.of("Character.md", {});

    const dv = new MockDataView(page);

    const tested = new AbilityRollRepository(dv);

    const result = tested.parse(page);

    const { warnings } = result.unwrap()

    assert.ok(warnings);

    assert.deepStrictEqual(
        warnings.issues.map(issue => issue.path.join(".")),
        ABILITIES.map(ability => `${ability} Roll`),
        "Missing abilities from warnings"
    )
})

test("Warns user if some abilities is missing", async () => {
    const page = MockPage.of("Character.md", {
        "Strength Roll": "10",
    });

    const dv = new MockDataView(page);

    const tested = new AbilityRollRepository(dv);

    const result = tested.parse(page);

    const { output, warnings } = result.unwrap()

    assert.ok(warnings);

    assert.equal(output.Strength, page["Strength Roll"]);

    assert.deepStrictEqual(
        warnings.issues.map(issue => issue.path.join(".")),
        ABILITIES
            .map(ability => `${ability} Roll`)
            .filter(roll => !(roll in page)),
        "Missing abilities from warnings"
    )
})

test("Fails if some abilities have wrongly typed values", async () => {
    const page = MockPage.of("Character.md", {
        "Strength Roll": "hello",
    });

    const dv = new MockDataView(page);

    const tested = new AbilityRollRepository(dv);

    const result = tested.parse(page);

    const error = result.unwrapError()

    console.log(error);

    assert.deepStrictEqual(
        error.issues.map(issue => issue.path.join(".")),
        ["Strength Roll"]
    );
})

test("Fails if some abilities have too large values", async () => {
    const page = MockPage.of("Character.md", {
        "Strength Roll": "56",
    });

    const dv = new MockDataView(page);

    const tested = new AbilityRollRepository(dv);

    const result = tested.parse(page);

    const error = result.unwrapError()

    console.log(error);

    assert.deepStrictEqual(
        error.issues.map(issue => issue.path.join(".")),
        ["Strength Roll"]
    );
})

test("Fails if some abilities have too small values", async () => {
    const page = MockPage.of("Character.md", {
        "Strength Roll": "0",
    });

    const dv = new MockDataView(page);

    const tested = new AbilityRollRepository(dv);

    const result = tested.parse(page);

    const error = result.unwrapError()

    console.log(error);

    assert.deepStrictEqual(
        error.issues.map(issue => issue.path.join(".")),
        ["Strength Roll"]
    );
})

test("Fetches ability bonuses from page", async () => {
    const page = MockPage.of("Character.md", {
        "Strength": "+3",
    });

    const dv = new MockDataView(page);

    const tested = new AbilityBonusRepository(dv);

    const result = tested.parse(page);

    const { output, warnings } = result.unwrap()

    assert.ok(!warnings);

    assert.ok(output);

    assert.equal(output.Strength, page["Strength"]);
    assert.ok(!output.Dexterity);
    assert.ok(!output.Constitution);
})

test("Fetches negative ability bonuses", async () => {
    const page = MockPage.of("Character.md", {
        "Strength": "-1",
    });

    const dv = new MockDataView(page);

    const tested = new AbilityBonusRepository(dv);

    const result = tested.parse(page);

    const { output, warnings } = result.unwrap()

    assert.ok(!warnings);

    assert.ok(output);

    assert.equal(output.Strength, page["Strength"]);
    assert.ok(!output.Dexterity);
    assert.ok(!output.Constitution);
})

test("Fails if page has multiple ability bonuses", async () => {
    const page = MockPage.of("Character.md", {
        "Strength": ["-1", "+4"],
    });

    const dv = new MockDataView(page);

    const tested = new AbilityBonusRepository(dv);

    const result = tested.parse(page);

    const error = result.unwrapError()

    console.log(error);

    assert.deepStrictEqual(
        error.issues.map(issue => issue.path.join(".")),
        ["Strength"]
    );
})