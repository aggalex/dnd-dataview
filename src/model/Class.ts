import {Reference} from "@/model/Dataview";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {FeatureProvider} from "@/model/Feature";

export interface Class extends FeatureProvider {
    hitDice: string;
    initialHitDice: number;
    proficiencies: ProficiencyIndex;
}

export type FeatureIndex = {
    Feature: Reference[] | Reference;
};