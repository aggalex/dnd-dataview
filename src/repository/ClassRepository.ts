import {Repository, DataViewQuery, RepositoryResult} from "@/repository/Repository";
import {Class} from "@/model/Class";
import {Page, Reference, referenceSchema} from "@/model/Dataview";
import {z, ZodError} from "zod";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {coerce} from "@/model/Util";
import {Result} from "@/model/Error";

export class ClassRepository extends Repository<Class> {
    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);

    private readonly required = z.object({
        "Hit Dice": z.string().optional().default("d8"),
        "Initial Hit Dice": z.number().optional().default(1),
    });

    private readonly warnings = z.looseObject(Object.fromEntries(this.required.keyof()
        .options
        .map(item => [item, z.unknown()])
    ))
        .refine(item => !item["Hit Dice"] || !item["Initial Hit Dice"], {
            error: "Missing Hit Dice",
        })

    private readonly classQuery = new DataViewQuery({
        required: this.required,
        warnings: this.warnings,
    })
        .transform(item => ({
            hitDice: item["Hit Dice"],
            initialHitDice: item["Initial Hit Dice"]
        }))

    parse(page: Page): RepositoryResult<Class> {

        const partialClass = this.classQuery.parse(page);

        const proficiencies = this.proficiencyRepository.parse(page);

        return RepositoryResult.of([partialClass, proficiencies] as const)
            .map(({ output: [partialClass, proficiencies], warnings }) => ({
                output: {
                    ...partialClass,
                    proficiencies
                } satisfies Class,
                warnings
            }));
    }

    async getFeaturesByReferenceAndLevel(reference: Reference): Promise<RepositoryResult<Reference[][]>> {
        const pageFeatures = z.looseObject({
            Feature: coerce.array(referenceSchema)
        })
        const query = new DataViewQuery({
            required: pageFeatures
        });
        const page = this.dv.page(reference);

        const explicitFeaturesResult = page
            ? query.parse(page ?? {})
            : Result.ok({ output: { Feature: [] } }) as RepositoryResult<z.infer<typeof pageFeatures>>;

        if (!explicitFeaturesResult.isOk()) {
            return Result.error(explicitFeaturesResult.unwrapError());
        }

        const explicitFeatures = explicitFeaturesResult.unwrap();

        const features = await this.dv.query(`LIST FROM "Features"`);

        const featurePageQuery = new DataViewQuery({
            required: z.looseObject({
                class: referenceSchema,
                level: z.number().optional().default(0),
            })
        })

        const errors = [(explicitFeatures.warnings)]
        const output: Reference[][] = []

        for (const featureRef of features.value.values) {
            const page = this.dv.page(featureRef);

            if (!page) {
                continue;
            }

            const result = featurePageQuery.parse(page);
            if (!result.ok) {
                errors.push(result.unwrapError());
                continue;
            }

            const descriptor = result.unwrap().output;
            const classPage = this.dv.page(descriptor.class);
            if (!classPage || classPage.file.link !== page.file.link) {
                continue;
            }

            if (output[descriptor.level] === undefined) {
                output[descriptor.level] = []
            }

            output[descriptor.level].push(featureRef);
        }

        const warnings = errors.filter(a => a) as ZodError[];
        const warning = warnings && warnings.length > 0 ? new ZodError(warnings.flatMap(err => err.issues)): undefined;

        return Result.ok({ output, warnings: warning });
    }

}