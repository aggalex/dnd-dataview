import test from "node:test";
import {MockDataView, MockPage} from "@tests/mock.test";
import assert from "node:assert";
import {CharacterRepository} from "@/repository/CharacterRepository";

const examplePage = MockPage.of("Character", {
    "Proficiency Bonus": 2,
    "Skill Proficiency": ["Deception", "Persuasion", "Sleight of Hand", "Stealth"],
    "Skill Expertise": ["Stealth", "Sleight of Hand"],
    "Language": ["Druidic", "Sylvan", "Elvish", "Common"],
    Race: "Loxodon"
});

test("Loads Character", async () => {
    const dv = new MockDataView(examplePage);

    const tested = new CharacterRepository(dv);

    const result = tested.parse(examplePage);

    const { output, warnings } = result.unwrap()

    assert.ok(output);
})