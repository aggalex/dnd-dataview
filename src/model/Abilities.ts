import {Page, Reference} from "@/model/Dataview";
import {z} from "zod";

export const ABILITIES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"] as const;

export const abilitySchema = z.enum(ABILITIES);

export type Ability = z.infer<typeof abilitySchema>;

export type AbilityScores = {
    [key in Ability]: number;
}

export const SKILLS = {
    "Strength": [
        "Athletics"
    ],
    "Dexterity": [
        "Acrobatics",
        "Sleight of Hand",
        "Stealth"
    ],
    "Constitution": [],
    "Intelligence": [
        "Arcana",
        "History",
        "Investigation",
        "Nature",
        "Religion"
    ],
    "Wisdom": [
        "Animal Handling",
        "Insight",
        "Medicine",
        "Perception",
        "Survival"
    ],
    "Charisma": [
        "Deception",
        "Intimidation",
        "Performance",
        "Persuasion"
    ]
} as const;

export const ALL_SKILLS = Object.values(SKILLS).flat();

export const skillSchema = z.enum(ALL_SKILLS);

export type Skill = z.infer<typeof skillSchema>;

export type SkillScores = {
    [key in Skill]: number;
};

export type AbilityBonusProvider = {
    abilityBonus?: { [key in Ability]?: number; };
    reference: Reference;
}