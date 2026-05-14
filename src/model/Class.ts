import {Reference} from "@/model/Dataview";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";

export interface Class {
    hitDice: string;
    initialHitDice: number;
    proficiencies: ProficiencyIndex;
}

export type FeatureIndex = {
    Feature: Reference[] | Reference;
};