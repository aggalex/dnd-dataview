import {Reference} from "@/model/Dataview";
import {z} from "zod";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {FeatureProvider} from "@/model/Feature";
import {AbilityBonusProvider} from "@/model/Abilities";
import {Spell, SpellProvider} from "@/model/Spell";

export const sizeSchema = z.enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"])

export type Size = z.infer<typeof sizeSchema>;

export interface Race extends FeatureProvider, AbilityBonusProvider, SpellProvider {
    features: Reference[];
    languages: Reference[];
    speed: number;
    size: Size;
    traits: Reference[];
    reference: Reference;
    proficiencies: ProficiencyIndex;
}

export interface CompositeRace extends Race {
    abilityBonusProviders: AbilityBonusProvider[];
}