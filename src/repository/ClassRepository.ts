import {Repository, RepositoryResult} from "@/repository/Repository";
import {Class} from "@/model/Class";
import {Page, pageSchema, Reference} from "@/model/Dataview";
import {z, ZodError} from "zod";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {coerce} from "@/model/Util";
import {Result} from "@/model/Error";

export class ClassRepository extends Repository<Class> {
    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);

    readonly base = z.object({
        "Hit Dice": z.string().optional().default("d8"),
        "Initial Hit Dice": z.number().optional().default(1),
        "Feature": coerce.array(Reference.schema)
    })

    readonly required = this.base
        .and(this.reference)
        .and(this.proficiencyRepository.required.transform(proficiencies => ({proficiencies})))
        .transform(item => ({
            hitDice: item["Hit Dice"],
            initialHitDice: item["Initial Hit Dice"],
            features: item.Feature,
            proficiencies: item.proficiencies,
            reference: item.reference,
        }));

    readonly warnings = z.looseObject(Object.fromEntries(this.base.keyof()
        .options
        .map(item => [item, z.unknown()])
    ))
        .refine(item => !item["Hit Dice"] || !item["Initial Hit Dice"], {
            error: "Missing Hit Dice",
        });

    async getFeaturesByReferenceAndLevel(reference: Reference): Promise<RepositoryResult<Reference[][]>> {
        const pageFeatures = z.looseObject({
            Feature: coerce.array(Reference.schema)
        })

        const page = this.getPage(reference);

        const explicitFeaturesResult = page && pageFeatures.safeParse(page ?? {});

        if (explicitFeaturesResult && !explicitFeaturesResult.success) {
            return Result.error(explicitFeaturesResult.error);
        }

        const explicitFeatures = explicitFeaturesResult?.data;

        const features = await this.dv.query(`LIST FROM "Features"`);

        const featurePageQuery = z.looseObject({
            class: Reference.schema,
            level: z.number().optional().default(0),
        })

        const errors = []
        const output: Reference[][] = []

        for (const featureRef of features.value.values) {
            const page = this.getPage(featureRef);

            if (!page) {
                continue;
            }

            const result = featurePageQuery.safeParse(page);
            if (!result.success) {
                errors.push(result.error);
                continue;
            }

            const descriptor = result.data;
            const classPage = this.getPage(descriptor.class);
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