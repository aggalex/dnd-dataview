import {Page, Reference, DataView} from "@/model/Dataview";
import { basename } from "node:path";
import {mock} from "node:test";

export class MockPage implements Page {

    readonly file: { name: string; path: string; link: Reference };

    private constructor(path: string) {
        this.file = {
            name: basename(path, ".md"),
            path,
            link: { path }
        }
    }

    static of<R extends Record<string, unknown>>(path: string, props: R): MockPageInstance<R> {
        const instance = new MockPage(path) as MockPageInstance<R>;
        Object.assign(instance, props);
        return instance;
    }

}

export type MockPageInstance<R extends Record<string, unknown>> = MockPage & R

export class MockDataView implements DataView {
    constructor(readonly currentPage: Page) {
    }

    readonly current = mock.fn(() => this.currentPage)
    readonly el = mock.fn()
    readonly header = mock.fn()
    readonly page = mock.fn()
    readonly paragraph = mock.fn()
    readonly query = mock.fn()
    readonly span = mock.fn()
    readonly table = mock.fn()
}