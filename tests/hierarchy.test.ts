import test from "node:test";
import {MockDataView, MockPage} from "@tests/mock.test";
import assert from "node:assert";
import {RaceRepository} from "@/repository/RaceRepository";
import {ProficiencyIndex} from "@/model/Proficiency";

test("Ensure hierarchy is resolved", async () => {
    const dv = new MockDataView(MockPage.of("Grugach Elf", {
        "Saving Throw Proficiency": "Strength",
        inherit: "Elf"
    }));
    dv.addPage(MockPage.of("Elf", {
        "Saving Throw Proficiency": "Charisma"
    }));

    const tested = new RaceRepository(dv);

    const result = tested.getByReference("Grugach Elf");

    const { output, warnings } = result!.unwrap()

    assert.ok(output);

    assert.deepStrictEqual(output.proficiencies, new ProficiencyIndex({
        savingThrow: [
            {
                item: "Strength",
                type: "Proficiency",
                justification: { path: "Grugach Elf" },
            },
            {
                item: "Charisma",
                type: "Proficiency",
                justification: { path: "Elf" },
            }
        ]
    }));
})