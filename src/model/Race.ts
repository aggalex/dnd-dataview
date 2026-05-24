import {Reference} from "@/model/Dataview";
import {z} from "zod";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {FeatureProvider} from "@/model/Feature";
import {AbilityBonusProvider} from "@/model/Abilities";

export const sizeSchema = z.enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"])

export type Size = z.infer<typeof sizeSchema>;

export interface Race extends FeatureProvider, AbilityBonusProvider {
    features: Reference[];
    languages: Reference[];
    speed: number;
    size: Size;
    traits: Reference[];
    reference: Reference;
    proficiencies: ProficiencyIndex;
}