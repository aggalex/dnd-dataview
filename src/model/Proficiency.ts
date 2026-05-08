import {z} from "zod";
import {referenceSchema} from "@/model/Dataview";
import {abilitySchema} from "@/model/Abilities";

export const baseBonusSchema = z.object({
    justification: referenceSchema
});

export type Bonus = z.infer<typeof baseBonusSchema>;

export const proficiencySchema = <T extends z.ZodType<any>>(item: T) => baseBonusSchema.extend({
    item,
    type: z.enum(["Proficiency", "Expertise"]).default("Proficiency"),
    property: z.string(),
})

export type Proficiency<T> = z.infer<ReturnType<typeof proficiencySchema<z.ZodType<T>>>>;

export const weaponProficiencySchema = proficiencySchema(referenceSchema)

export type WeaponProficiency = z.infer<typeof weaponProficiencySchema>;

export const abilityBonusSchema = baseBonusSchema.and(z.partialRecord(abilitySchema, z.coerce.number()));

export type AbilityBonus = z.infer<typeof abilityBonusSchema>;