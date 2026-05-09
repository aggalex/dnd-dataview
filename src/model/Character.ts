import {Reference} from "@/model/Dataview";
import {AbilityBonusIndex, AbilityScores, SkillScores} from "@/model/Abilities";
import {Proficiency} from "@/model/Proficiency";

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

export interface Character {
    reference: Reference;
    class: CharacterClass[],
    race: Reference,
    background?: Reference,
    armor?: Reference,
    weapons: Reference[],
    money: Money,
    maxHP: number,
    abilityRolls: AbilityScores,
    proficiencies: Proficiency<unknown>[]
}

export interface CalculatedCharacter extends Character {
    speed: number;
    proficiencyBonus: number,
    abilityBonusIndex: AbilityBonusIndex[],
    proficiencies: Proficiency<unknown>[],
    savingThrows: AbilityScores,
    abilityScores: AbilityScores,
    abilityChecks: AbilityScores,
    skills: SkillScores,
}