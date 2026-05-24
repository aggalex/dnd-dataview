import {z} from "zod";
import {Repository} from "@/repository/Repository";
import {Feature, FeatureProvider} from "@/model/Feature";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {Reference} from "@/model/Dataview";
import {coerce} from "@/model/Util";
import {AbilityBonusRepository} from "@/repository/AbilityRepository";

export class FeatureRepository extends Repository<Feature> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);
    private readonly abilityBonusRepository = new AbilityBonusRepository(this.dv);

    readonly required = z.looseObject({
        "Base AC": z.coerce.number("Base AC").optional(),
        level: z.coerce.number().optional(),
        class: Reference.schema.optional()
    })
        .and(this.reference)
        .and(this.proficiencyRepository.required.transform(proficiencies => ({proficiencies})))
        .and(this.abilityBonusRepository.required.transform(abilityBonus => ({ abilityBonus })))
        .transform(({"Base AC": armorClass, reference, proficiencies, abilityBonus, level, class: cls}): Feature =>
            ({
                armorClass,
                reference,
                proficiencies,
                abilityBonus,
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