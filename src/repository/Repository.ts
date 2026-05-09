import {Reference, DataView, Page} from "@/model/Dataview";
import {z, ZodError} from "zod";
import {Result} from "@/model/Error";

export abstract class Repository<Item> {
    constructor(readonly dv: DataView) {
    }

    abstract parse(page: Page): RepositoryResult<Item>;
    getByReference(reference: Reference): RepositoryResult<Item> | undefined {
        if (typeof reference === "object") {
            reference = reference.path
        }

        const page = this.dv.page(reference);
        return page? this.parse(page): undefined;
    }
}

interface IPageQuery<Item> {
    required: z.ZodType<Item>,
    warnings?: z.ZodType,
}

interface SuccessfulQueryResult<Item> {
    output: Item,
    warnings?: ZodError
}

export class DataViewQuery<Item> implements IPageQuery<Item> {
    readonly required: z.ZodType<Item>;
    readonly warnings: z.ZodType = z.any();

    constructor(query: IPageQuery<Item>) {
        this.required = query.required;
        if (query.warnings)
            this.warnings = query.warnings;
    }

    parse(page: Page): RepositoryResult<Item> {
        const result = this.required.safeParse(page);
        if (!result.success) {
            return Result.error(result.error)
        }

        const { error } = this.warnings.safeParse(page);

        return Result.ok({
            output: result.data,
            warnings: error
        });
    }

    transform<U>(fn: (item: Item) => U): DataViewQuery<U> {
        return new DataViewQuery<U>({
            required: this.required.transform(fn),
            warnings: this.warnings as unknown as z.ZodType<U>,
        })
    }
}

export type RepositoryResult<Item> = Result<SuccessfulQueryResult<Item>, ZodError>;

type RepositoryResultItemOf<RS extends RepositoryResult<any>> = RS extends RepositoryResult<infer Item>? Item: never;
type MapRepositoryResults<Arr extends [...any[]]> = {
    [Index in keyof Arr]: RepositoryResultItemOf<Arr[Index]>
} & Array<RepositoryResult<RepositoryResultItemOf<Arr[number]>>>;

export const RepositoryResult = {
    combine<Item>(...results: RepositoryResult<Item[]>[]): RepositoryResult<Item[]> {
        return this.of(results)
            .map(({output, warnings}: SuccessfulQueryResult<Item[][]>): SuccessfulQueryResult<Item[]> => ({
                output: output.flatMap(res => res),
                warnings
            })) as RepositoryResult<Item[]>;
    },

    of<Items extends RepositoryResult<unknown>[]>(results: Items): RepositoryResult<MapRepositoryResults<Items>> {
        const errors = results.filter(res => !res.ok);

        if (errors.length > 0) {
            return Result.error(new ZodError(errors.flatMap(err => err.unwrapError().issues)))
        }

        const queryResults = results.map(res => res.unwrap())

        const warnings = queryResults
            .flatMap(({ warnings }) => warnings)
            .flatMap(err => err?.issues ?? []);

        return Result.ok({
            output: queryResults.map(({ output }) => output),
            warnings: warnings.length > 0? new ZodError(warnings) : undefined,
        } as SuccessfulQueryResult<MapRepositoryResults<Items>>)

    }
}