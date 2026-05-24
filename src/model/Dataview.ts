import {z} from "zod";

export class Reference {
    static readonly schema = z.object({
        path: z.string(),
        display: z.string().optional(),
    }).or(z.string())
        .transform(item => Reference.from(item))

    constructor(
        readonly path: string,
        readonly display?: string
    ) {
    }

    static from(params: { path: string, display?: string } | string) {
        if (typeof params === "string") {
            return new Reference(params)
        } else {
            return new Reference(params.path, params.display);
        }
    }

    toString() {
        let name: string | undefined
        if (!this.display) {
            const path = this.path.split("/");
            name = path[path.length - 1].split(".")[0];
        } else {
            name = this.display
        }

        if (name === this.path) {
            name = undefined
        }
        return `[[${[this.path, name].filter(a => a).join("|")}]]`

    }
}

export function getPath(reference: Reference) {
    if (typeof reference === "string") {
        return reference;
    } else {
        return reference.path;
    }
}

export interface Page {
    file: {
        name: string;
        path: string;
        link: z.infer<typeof Reference.schema>;
    };
    [key: string]: any;
}

export const pageSchema = z.object({
    file: z.object({
        name: z.string(),
        path: z.string(),
        link: Reference.schema,
    })
})

export interface DataView {
    current(): Page;
    page(query: string): Page | undefined;
    query(query: string): Promise<{ value: { values: Reference[] }}>;
    span(text: string[] | string): void;
    fileLink(path: string, embed?: boolean, displayName?: string): void;
    el(tag: string): void;
    table(headers: string[], rows: readonly (readonly unknown[])[]): void;
    header(level: number, text: string): void;
    paragraph(text: string): void;
}