import {z} from "zod";
import {Reference, referenceSchema} from "@/model/Dataview";
import {Ability, abilitySchema, Skill} from "@/model/Abilities";

export const baseBonusSchema = z.object({
    justification: referenceSchema
});

export type Bonus = z.infer<typeof baseBonusSchema>;

export const proficiencySchema = <T extends z.ZodType<any>>(item: T) => baseBonusSchema.extend({
    item,
    type: z.enum(["Proficiency", "Expertise"]).default("Proficiency"),
})

export type Proficiency<T> = z.infer<ReturnType<typeof proficiencySchema<z.ZodType<T>>>>;

export const weaponProficiencySchema = proficiencySchema(referenceSchema)

export type WeaponProficiency = z.infer<typeof weaponProficiencySchema>;

export const abilityBonusSchema = baseBonusSchema.and(z.partialRecord(abilitySchema, z.coerce.number()));

export type AbilityBonus = z.infer<typeof abilityBonusSchema>;

export type IProficiencyIndex = {
    savingThrow?: Proficiency<Ability>[],
    initiativeBonus?: Proficiency<number>[],
    skill?: Proficiency<Skill>[],
    armor?: Proficiency<string>[],
    tool?: Proficiency<Reference>[],
    weapon?: Proficiency<Reference>[],
    weaponType?: Proficiency<string>[]
}

const proficiencies: (keyof IProficiencyIndex)[] = [
    "savingThrow",
    "initiativeBonus",
    "skill",
    "armor",
    "tool",
    "weapon",
    "weaponType"
]

export class ProficiencyIndex implements IProficiencyIndex {
    savingThrow: Proficiency<Ability>[] = []
    initiativeBonus: Proficiency<number>[] = []
    skill: Proficiency<Skill>[] = []
    armor: Proficiency<string>[] = []
    tool: Proficiency<Reference>[] = []
    weapon: Proficiency<Reference>[] = []
    weaponType: Proficiency<string>[] = []

    constructor(...props: IProficiencyIndex[]) {
        for (const index of props) {
            for (const key of proficiencies) {
                index[key] && this[key].push(...index[key] as any);
            }
        }
    }
}