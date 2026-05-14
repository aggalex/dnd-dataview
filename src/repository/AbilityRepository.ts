import {Repository} from "@/repository/Repository";
import {ABILITIES, Ability, abilitySchema, AbilityScores} from "@/model/Abilities";
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

    readonly warnings = this.abilitySchema(this.baseValueSchema);
    readonly required = this.abilitySchema(this.baseValueSchema.optional().default(NaN))
        .transform(object => Object.fromEntries(
            ABILITIES.map(ability => [ability, object[`${ability} Roll`]] as const)
        ) as Record<Ability, number>);
}

export class AbilityBonusRepository extends Repository<AbilityBonus> {
    private abilitySchema(value: z.ZodType) {
        return z.looseObject(
            Object.fromEntries(ABILITIES.map(ability => [ability, value] as const)))
    }

    private readonly baseValue = z.coerce.number()
        .or(z.array(z.any()).refine(() => false, "Only one ability bonus per page per ability is supported"))
        .optional();

    readonly warnings = this.abilitySchema(this.baseValue
            .refine(value => value != 0, { error: "Ability bonus of 0" }));

    readonly required = this.abilitySchema(this.baseValue)
        .and(this.reference)
        .transform(object => ({
            ...Object.fromEntries(Object.entries(object).filter(([prop, val]) => abilitySchema.safeParse(prop).success)),
            justification: object.reference
        }));
}