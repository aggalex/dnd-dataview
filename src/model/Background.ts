import {Reference} from "@/model/Dataview";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {FeatureProvider} from "@/model/Feature";
import {AbilityBonusProvider} from "@/model/Abilities";

export interface Background extends FeatureProvider, AbilityBonusProvider {
    features: Reference[];
    languages: Reference[];
    traits: Reference[];
    reference: Reference;
    proficiencies: ProficiencyIndex;
}