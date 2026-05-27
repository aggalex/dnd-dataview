import {Reference} from "@/model/Dataview";
import {z} from "zod";

export const weaponSchema = z.object({
    attack: z.number().optional(),
    damage: z.string().optional(),
    type: z.string().optional(),
    range: z.string().optional(),
    reach: z.enum(["melee", "ranged"]).optional(),
});

export type Weapon = z.infer<typeof weaponSchema> & {
    reference: Reference,
}

export type Armor = {
    armorClass?: number,
    type?: string,
    weight?: string,
    reference: Reference,
}