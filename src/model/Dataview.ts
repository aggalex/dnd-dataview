import {z} from "zod";

export interface Page {
    file: {
        name: string;
        path: string;
        link: Reference;
    };
    [key: string]: any;
}

export interface DataView {
    current(): Page;
    page(query: Reference): Page | undefined;
    query(query: string): Promise<{ value: { values: Reference[] }}>;
    span(text: Reference[] | Reference): void;
    el(tag: string): void;
    table(headers: string[], rows: readonly unknown[][]): void;
    header(level: number, text: string): void;
    paragraph(text: string): void;
}

export const referenceSchema = z.object({ path: z.string() }).or(z.string());

export type Reference = z.infer<typeof referenceSchema>