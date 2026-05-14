import {Repository} from "@/repository/Repository";
import {pageSchema, referenceSchema} from "@/model/Dataview";
import {coerce} from "@/model/Util";
import {z} from "zod";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {Background} from "@/model/Background";

export class BackgroundRepository extends Repository<Background> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);

    readonly required = z.looseObject({
        "Feature": coerce.array(referenceSchema),
        "Language": coerce.array(referenceSchema),
        "Trait": coerce.array(referenceSchema),
    })
        .and(this.proficiencyRepository.required.transform(proficiencies => ({ proficiencies })))
        .and(this.reference)
        .transform(background => ({
            features: background.Feature,
            languages: background.Language,
            traits: background.Trait,
            proficiencies: background.proficiencies,
            reference: background.reference,
        } satisfies Background));

}