import {Reference} from "@/model/Dataview";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {FeatureProvider} from "@/model/Feature";

export interface Background extends FeatureProvider {
    features: Reference[];
    languages: Reference[];
    traits: Reference[];
    reference: Reference;
    proficiencies: ProficiencyIndex;
}