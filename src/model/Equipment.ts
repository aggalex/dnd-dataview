import {Reference} from "@/model/Dataview";
import {z} from "zod";

export const weaponSchema = z.object({
    attack: z.number().optional(),
    damage: z.number().optional(),
    type: z.string().optional(),
    range: z.number().optional(),
    reach: z.enum(["melee", "ranged"]).optional(),
});

export type Weapon = z.infer<typeof weaponSchema> & {
    reference: Reference,
}

export const armorSchema = z.object({
    armorClass: z.string().optional(),
    type: z.string().optional(),
    weight: z.string().optional(),
})

export type Armor = z.infer<typeof armorSchema> & {
    reference: Reference,
}