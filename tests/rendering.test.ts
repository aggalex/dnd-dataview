import test from "node:test";
import {Reference} from "@/model/Dataview";
import assert from "node:assert";
import {MockDataView} from "@tests/mock.test";
import {ErrorSection} from "@/view/widget/Error";
import {ModelError} from "@/model/Error";

test("Ensure path is cut properly when rendering reference", async () => {
    const reference = new Reference("path/to/page.md");

    assert.strictEqual(reference.toString(), "[[path/to/page.md|page]]");
})