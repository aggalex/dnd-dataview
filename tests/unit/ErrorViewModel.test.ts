import {MockDataView} from "@tests/mock.test";
import {ErrorSection} from "@/model/render/Error";
import {ErrorViewModel} from "@/viewModel/ErrorViewModel";
import test from "node:test";
import {z} from "zod";
import {Reference} from "@/model/Dataview";
import assert from "node:assert";

test("Ensure error renders properly", async () => {
    const dv = new MockDataView();
    const tested = new ErrorViewModel();

    const res = z.object({
        a: z.number(),
        b: z.string(),
        c: z.array(z.string()),
    }).safeParse({
        d: 3,
        b: 4,
        a: "hello",
        c: "world",
    });

    if (!res.error) {
        throw new Error("Expected error");
    }

    tested.addZodError(res.error, new Reference("Me"), "test", "Error");

    tested.errors.getErrors().forEach(err => new ErrorSection(err).renderIn(dv));

    const errors = dv.paragraph.mock.calls.flatMap(({ arguments: [text] }, invocation) => text.split("\n").map((line, j) => ({
        text: line,
        line: j,
        invocation,
        toString() {
            return `On invocation ${this.invocation}: ${tested.errors.getErrors()[this.invocation].title.padEnd(40)} \n - line: ${this.line}`;
        }
    })))
        .filter(({text, line}) => !text.startsWith("> ") && line > 0);

    // assert.ok(errors.length === 0, "Bad lines\n" + errors.join("\n"));
})