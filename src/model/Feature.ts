import {Reference} from "@/model/Dataview";
import {ProficiencyIndex} from "@/model/Proficiency";

export interface Feature {
    reference: Reference,
    armorClass?: number,
    proficiencies: ProficiencyIndex,
    from?: Reference,
}

export interface FeatureProvider {
    features: Reference[];
    reference: Reference;
}