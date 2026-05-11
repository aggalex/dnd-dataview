import {Page, Reference, DataView} from "@/model/Dataview";
import { basename } from "node:path";
import {mock} from "node:test";
import {Repository} from "@/repository/Repository";
import {Result} from "@/model/Error";
import {ZodError} from "zod";
import {Controller} from "@/controller/Controller";

export class MockPage implements Page {

    readonly file: { name: string; path: string; link: Reference };

    private constructor(path: string) {
        this.file = {
            name: basename(path, ".md"),
            path,
            link: { path }
        }
    }

    static of(path: string): MockPage
    static of<R extends Record<string, unknown>>(path: string, props: R): MockPage & R
    static of<R extends Record<string, unknown>>(path: string, props: R = {} as R): MockPage & R {
        const instance = new MockPage(path) as MockPage & R;
        Object.assign(instance, props);
        return instance;
    }

}

export function referenceToString(ref: Reference) {
    if (typeof ref === "string") {
        return ref;
    }

    return ref.path;
}

export class MockDataView implements DataView {

    readonly pages: { [key: string]: Page } = {}

    constructor(readonly currentPage: Page = MockPage.of("This.md")) {
        this.addPage(currentPage);
    }

    current = mock.fn(() => this.currentPage)
    el = mock.fn()
    header = mock.fn()
    page = mock.fn(ref => this.pages[ref])
    paragraph = mock.fn()
    query = mock.fn(async (item) => ({ value: { values: [] }}))
    span = mock.fn()
    table = mock.fn()

    addPage(page: Page) {
        const ref = referenceToString(page.file.link);
        this.pages[ref] = page;
    }
}

export const mocker = {

    mockRepository<R extends { new(...args: never): Repository<unknown> }>(Repository: R) {
        const mockRepo: InstanceType<typeof Repository> = Object.create(Object.getPrototypeOf(Repository));
        mockRepo.parse = mock.fn((page: Page) => Result.error(new ZodError([])));
        mockRepo.getByReference = mock.fn(() => undefined);
        return mockRepo;
    },

    mock<C extends { new(...args: never): unknown }>(Class: C) {
        const mockObject: InstanceType<typeof Class> = Object.create(Object.getPrototypeOf(Class));
        return mockObject;
    }
}