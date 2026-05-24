import {Reference} from "@/model/Dataview";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {FeatureProvider} from "@/model/Feature";
import {AbilityBonusProvider} from "@/model/Abilities";

export interface Class extends FeatureProvider, AbilityBonusProvider {
    hitDice: string;
    initialHitDice: number;
    proficiencies: ProficiencyIndex;
}

export type FeatureIndex = {
    Feature: Reference[] | Reference;
};