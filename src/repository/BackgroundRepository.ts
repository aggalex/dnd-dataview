import {DataViewQuery, Repository, RepositoryResult} from "@/repository/Repository";
import {Page, referenceSchema} from "@/model/Dataview";
import {coerce} from "@/model/Util";
import {z} from "zod";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {Background} from "@/model/Background";

export class BackgroundRepository extends Repository<Background> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);

    private readonly required = z.looseObject({
        "Feature": coerce.array(referenceSchema),
        "Language": coerce.array(referenceSchema),
        "Trait": coerce.array(referenceSchema),
    });

    private readonly backgroundQuery = new DataViewQuery({ required: this.required });

    parse(page: Page): RepositoryResult<Background> {
        const background = this.backgroundQuery.parse(page);
        const proficiencies = this.proficiencyRepository.parse(page);

        return RepositoryResult.of([background, proficiencies] as const)
            .map(({ output: [race, proficiencies], warnings }) => ({
                output: {
                    features: race.Feature,
                    languages: race.Language,
                    traits: race.Trait,
                    proficiencies,
                    reference: page.file.link,
                } satisfies Background,
                warnings
            }))
    }

}