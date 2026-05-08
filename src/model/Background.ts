import {Reference} from "@/model/Dataview";
import {Proficiency} from "@/model/Proficiency";

export interface Background {
    features: Reference[];
    languages: Reference[];
    traits: Reference[];
    reference: Reference;
    proficiencies: Proficiency<unknown>[];
}