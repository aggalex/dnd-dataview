import {Reference} from "@/model/Dataview";
import {AbilityBonusIndex, AbilityScores, SkillScores} from "@/model/Abilities";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {Armor} from "@/model/Equipment";
import {Feature, FeatureProvider} from "@/model/Feature";

export interface CharacterClass {
    class: Reference;
    level: number;
    subclass?: Reference;
}

export interface Money {
    platinum: number;
    gold: number;
    electrum: number;
    silver: number;
    copper: number;
}

export interface Character extends FeatureProvider {
    reference: Reference;
    class: CharacterClass[],
    race: Reference,
    background?: Reference,
    armor?: Reference,
    weapons: Reference[],
    money: Money,
    maxHP: number,
    abilityRolls: AbilityScores,
    proficiencies: ProficiencyIndex
}

export interface CalculatedCharacter extends Character {
    speed: number,
    initiative: number,
    passivePerception: number,
    armorClass: number,
    proficiencyBonus: number,
    abilityBonusIndex: AbilityBonusIndex[],
    proficiencies: ProficiencyIndex,
    savingThrows: AbilityScores,
    abilityScores: AbilityScores,
    abilityChecks: AbilityScores,
    skills: SkillScores,
    allFeatures: Feature[],
}