import {z} from "zod";
import {Repository} from "@/repository/Repository";
import {Feature, FeatureProvider} from "@/model/Feature";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {Page, Reference} from "@/model/Dataview";
import {coerce} from "@/model/Util";

export class FeatureRepository extends Repository<Feature> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);

    readonly required = z.looseObject({
        "Base AC": z.coerce.number("Base AC").optional(),
        level: z.coerce.number().optional(),
        class: Reference.schema.optional()
    })
        .and(this.reference)
        .and(this.proficiencyRepository.required.transform(proficiencies => ({proficiencies})))
        .transform(({"Base AC": armorClass, reference, proficiencies, level, class: cls}): Feature =>
            ({
                armorClass,
                reference,
                proficiencies,
                for: cls != null? {
                    class: cls,
                    level: level ?? 0
                } : undefined
            }));
}

export class FeatureProviderRepository extends Repository<FeatureProvider> {

    readonly required = z.looseObject({
        "Feature": coerce.array(Reference.schema),
    })
        .and(this.reference)
        .transform(({"Feature": features, reference}) => ({ features, reference }));

}