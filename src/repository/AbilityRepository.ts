import {Repository, DataViewQuery, RepositoryResult} from "@/repository/Repository";
import {ABILITIES, Ability, AbilityScores} from "@/model/Abilities";
import {Page} from "@/model/Dataview";
import {AbilityBonus} from "@/model/Proficiency";
import {z} from "zod";

export class AbilityRollRepository extends Repository<AbilityScores> {

    private abilitySchema(value: z.ZodType<number>) {
        return z.looseObject(
            Object.fromEntries(ABILITIES.map(ability => [`${ability} Roll`, value] as const))
        );
    }

    private readonly baseValueSchema = z.coerce
        .number({ error: "Abilities should be numbers" })
        .min(1).max(20);

    readonly abilityRollQuery = new DataViewQuery({
        required: this.abilitySchema(this.baseValueSchema.optional().default(NaN)),
        warnings: this.abilitySchema(this.baseValueSchema),
    })

    override parse(page: Page) {
        return this.abilityRollQuery
            .transform(object => Object.fromEntries(
                ABILITIES.map(ability => [ability, object[`${ability} Roll`]] as const)
            ) as Record<Ability, number>)
            .parse(page);
    }
}

export class AbilityBonusRepository extends Repository<AbilityBonus> {
    private abilitySchema(value: z.ZodType) {
        return z.looseObject(
            Object.fromEntries(ABILITIES.map(ability => [ability, value] as const)))
    }

    private readonly baseValue = z.coerce.number()
        .or(z.array(z.any()).refine(() => false, "Only one ability bonus per page per ability is supported"))
        .optional();

    private readonly abilityBonusQuery = new DataViewQuery({
        required: this.abilitySchema(this.baseValue),
        warnings: this.abilitySchema(this.baseValue
            .refine(value => value != 0, { error: "Ability bonus of 0" }))
    })

    override parse(page: Page): RepositoryResult<AbilityBonus> {
        return this.abilityBonusQuery
            .transform(object => ({ ...object, justification: page.file.link }))
            .parse(page);
    }
}