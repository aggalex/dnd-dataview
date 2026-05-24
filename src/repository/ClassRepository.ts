import {Repository, RepositoryResult} from "@/repository/Repository";
import {Class} from "@/model/Class";
import {Page, pageSchema, Reference} from "@/model/Dataview";
import {z, ZodError} from "zod";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {coerce} from "@/model/Util";
import {Result} from "@/model/Error";
import {FeatureRepository} from "@/repository/FeatureRepository";
import {Feature} from "@/model/Feature";

export class ClassRepository extends Repository<Class> {
    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);
    private readonly featureRepository = new FeatureRepository(this.dv);

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

    async getFeaturesByReference(reference: Reference): Promise<RepositoryResult<Feature[]>> {
        const pageFeatures = z.looseObject({
            Feature: coerce.array(Reference.schema)
        })

        const page = this.getPage(reference);

        if (!page) {
            return Result.error(new ZodError([]));
        }

        const explicitFeaturesResult = page && pageFeatures.safeParse(page ?? {});

        if (explicitFeaturesResult && !explicitFeaturesResult.success) {
            return Result.error(explicitFeaturesResult.error);
        }

        const featureRefs = await this.dv.query(`LIST FROM "Features"`);

        const errors: ZodError[] = []

        const features = featureRefs.value.values.flatMap(featureRef => {
            const descriptor = this.featureRepository.getByReference(featureRef)
                ?.map(res => res.output)
                .mapErr(err => {
                    err.issues.forEach(issue => issue.path.unshift(featureRef.name))
                    errors.push(err);
                })
                .get();

            if (!descriptor?.for) {
                return [];
            }

            const classPage = this.getPage(descriptor.for.class);
            if (!classPage || classPage.file.link !== page.file.link) {
                return [];
            }

            return [descriptor]
        })

        const warnings = errors.filter(a => a) as ZodError[];
        const warning = warnings && warnings.length > 0 ? new ZodError(warnings.flatMap(err => err.issues)): undefined;

        return Result.ok({ output: features, warnings: warning });
    }

}