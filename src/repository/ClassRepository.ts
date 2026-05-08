import {Repository, DataViewQuery, RepositoryResult} from "@/repository/Repository";
import {Class} from "@/model/Class";
import {Page} from "@/model/Dataview";
import {z} from "zod";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";

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

}