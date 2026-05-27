import {Reference} from "@/model/Dataview";
import z from "zod";

export const spellComponentSchema = z.enum(["V", "S", "M"])

export type SpellComponent = z.infer<typeof spellComponentSchema>;

export interface Spell {
    reference: Reference;
    source?: string;
    level: number;
    school: string;
    castingTime: string;
    range: string;
    components: SpellComponent[];
    duration: string;
    spellList: Reference[];
}

export interface SpellProvider {
    spells: Reference[];
}