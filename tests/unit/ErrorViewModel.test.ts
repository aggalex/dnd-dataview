import {MockDataView} from "@tests/mock.test";
import {ErrorSection} from "@/model/render/Error";
import {ErrorViewModel} from "@/viewModel/ErrorViewModel";
import test from "node:test";
import {z} from "zod";
import {Reference} from "@/model/Dataview";
import assert from "node:assert";

const dv = new MockDataView();
const tested = new ErrorViewModel();

const wrongObject = {
    d: 3,
    b: 4,
    a: "hello",
    c: "world",
}

const schema = z.object({
    a: z.number(),
    b: z.string(),
    c: z.array(z.string()),
})

const res = schema.safeParse(wrongObject, { reportInput: true });

if (!res.error) {
    throw new Error("Expected error");
}

tested.addZodError(res.error, new Reference("Me"), "test", "Error");

tested.errors.getErrors().forEach(err => new ErrorSection(err).renderIn(dv));

test("Ensure error renders properly", async () => {
    const errors = dv.paragraph.mock.calls.flatMap(({ arguments: [text] }, invocation) => {
        const lines = text.split("\n");
        return lines.map((line, j) => ({
            text: line,
            line: j,
            invocation,
            toString() {
                const j = this.line
                const printedLines = lines
                    .slice(Math.max(0, j - 2), Math.min(lines.length, j + 2))
                    .map((line, i) => `${i === 2? " -- " : "    "} ${line}`);
                return `On invocation ${this.invocation}: ${tested.errors.getErrors()[this.invocation].title.padEnd(40)}
-> line: ${this.line}
${printedLines.join("\n")}
`;
            }
        }))
    })
        .filter(({text, line}) => !text.startsWith("> ") && line > 0);

    assert.ok(errors.length === 0, "Bad lines\n" + errors.join("\n"));
})

test("Ensure errors have proper input values", async () => {
    const vars = dv.paragraph.mock.calls.flatMap(({ arguments: [text] }) => [...text.matchAll(/\[\w*:: [^\]]*]/g)])
        .map(arr => arr[0]);

    assert.deepStrictEqual(new Set(vars), new Set(
        Object.entries(wrongObject)
            .filter(([key]) => key in schema.shape)
            .map(([key, value]) => `[${key}:: ${value}]`)))
})