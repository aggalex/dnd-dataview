import {Repository} from "@/repository/Repository";
import {Reference} from "@/model/Dataview";
import {coerce} from "@/model/Util";
import {z} from "zod";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {Background} from "@/model/Background";
import {AbilityBonusRepository} from "@/repository/AbilityRepository";

export class BackgroundRepository extends Repository<Background> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);
    private readonly abilityBonusRepository = new AbilityBonusRepository(this.dv);

    readonly required = z.looseObject({
        "Feature": coerce.array(Reference.schema),
        "Language": coerce.array(Reference.schema),
        "Trait": coerce.array(Reference.schema),
    })
        .and(this.proficiencyRepository.required.transform(proficiencies => ({ proficiencies })))
        .and(this.abilityBonusRepository.required.transform(abilityBonus => ({ abilityBonus })))
        .and(this.reference)
        .transform(background => ({
            features: background.Feature,
            languages: background.Language,
            traits: background.Trait,
            proficiencies: background.proficiencies,
            reference: background.reference,
            abilityBonus: background.abilityBonus
        } satisfies Background));

}