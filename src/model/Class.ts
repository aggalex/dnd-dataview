import {Reference} from "@/model/Dataview";
import {Proficiency} from "@/model/Proficiency";

export interface Class {
    hitDice: string;
    initialHitDice: number;
    proficiencies: Proficiency<unknown>[];
}

export type FeatureIndex = {
    Feature: Reference[] | Reference;
};