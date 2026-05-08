import {DataViewQuery, Repository, RepositoryResult} from "@/repository/Repository";
import {Race, sizeSchema} from "@/model/Race";
import {Page, referenceSchema} from "@/model/Dataview";
import {coerce} from "@/model/Util";
import {z} from "zod";
import {Hierarchical} from "@/model/Hierarchical";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";

export class RaceRepository extends Repository<Race> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);
    private readonly raceSchema = z.looseObject({
        "Feature": coerce.array(referenceSchema),
        "Language": coerce.array(referenceSchema),
        "Speed": z.coerce.number().optional().default(30),
        "Size": sizeSchema.optional().default("Medium"),
        "Trait": coerce.array(referenceSchema),
    });

    private readonly required = this.raceSchema.extend({
        inherit: referenceSchema.optional(),
        override: coerce.array(this.raceSchema.keyof()),
    });

    private readonly warnings = z.looseObject({
        "Speed": z.coerce.number(),
        "Size": sizeSchema,
    });

    private readonly query = new DataViewQuery({
        required: this.required,
        warnings: this.warnings
    });

    parse(page: Page): RepositoryResult<Hierarchical<Race>> {

        const race = this.query.parse(page);
        const proficiencies = this.proficiencyRepository.parse(page);

        return RepositoryResult.of([race, proficiencies] as const)
            .map(({ output: [race, proficiencies], warnings }) => ({
                output: {
                    features: race.Feature,
                    languages: race.Language,
                    speed: race.Speed,
                    size: race.Size,
                    traits: race.Trait,
                    proficiencies,
                    reference: page.file.link,
                    inherit: race.inherit,
                    overrides: race.override.map(key => ({
                        "Feature": "features",
                        "Language": "languages",
                        "Speed": "speed",
                        "Size": "size",
                        "Trait": "traits"
                    } as const)[key])
                } satisfies Hierarchical<Race>,
                warnings
            }))
    }

}