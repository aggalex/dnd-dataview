import {Reference} from "@/model/Dataview";
import {ProficiencyIndex} from "@/model/Proficiency";
import {AbilityBonusProvider} from "@/model/Abilities";

export interface Feature extends AbilityBonusProvider {
    reference: Reference,
    armorClass?: number,
    proficiencies: ProficiencyIndex,
    from?: Reference,
    for?: {
        class: Reference,
        level: number
    }
}

export interface FeatureProvider {
    features: Reference[];
    reference: Reference;
}

export interface ClassFeature extends Feature {
    for: NonNullable<Feature["for"]>
}

export function isClassFeature(feat: Feature): feat is ClassFeature {
    return !!feat.for
}