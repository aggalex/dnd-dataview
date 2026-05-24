import {Reference, DataView, Page, pageSchema} from "@/model/Dataview";
import {z, ZodError} from "zod";
import {Result} from "@/model/Error";

const referenceSchema = pageSchema.transform(({file}) => ({ reference: file.link }));

export abstract class Repository<Item> {
    constructor(readonly dv: DataView) {
    }

    readonly reference = referenceSchema;

    abstract readonly required: z.ZodType<Item>;
    readonly warnings: z.ZodType = z.looseObject({});

    protected getPage(reference: Reference) {
        return this.dv.page(reference.path)
    }

    parse(page: Page): RepositoryResult<Item> {
        const result = this.required.safeParse(page);
        if (!result.success) {
            return Result.error(result.error)
        }

        const { error } = this.warnings.safeParse(page);

        const output = result.data;

        return Result.ok({
            output,
            warnings: error
        });
    }

    getByReference(reference: Reference): RepositoryResult<Item> | undefined {
        const page = this.getPage(reference);
        return page? this.parse(page): undefined;
    }
}

interface SuccessfulQueryResult<Item> {
    output: Item,
    warnings?: ZodError
}

export type RepositoryResult<Item> = Result<SuccessfulQueryResult<Item>, ZodError>;

type RepositoryResultItemOf<RS extends RepositoryResult<any>> = RS extends RepositoryResult<infer Item>? Item: never;
type MapRepositoryResults<Arr extends [...any[]]> = {
    [Index in keyof Arr]: RepositoryResultItemOf<Arr[Index]>
} & Array<RepositoryResult<RepositoryResultItemOf<Arr[number]>>>;

export const RepositoryResult = {
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