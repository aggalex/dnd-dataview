import {customElement} from "lit/decorators.js";
import {css, html, LitElement} from "lit";
import "@/view/AbilityScore"
import "@/view/CharacterView"
import {CharacterView} from "@/view/CharacterView";
import {Reference} from "@/model/Dataview";

@customElement('dataview-dnd-test-env')
class TestEnv extends LitElement {

    static style = css`
        :host {
            font-family: var(--font-interface);
        }
        
        * {
            font-family: inherit;
        }
    `

    render() {
        const character = document.createElement("character-view") as CharacterView;
        character.character = {
            abilityBonus: undefined,
            abilityBonusProviders: [],
            abilityChecks: {
                Strength: 0,
                Dexterity: 0,
                Constitution: 0,
                Intelligence: 0,
                Wisdom: 0,
                Charisma: 0
            },
            abilityRolls: {
                Strength: 0,
                Dexterity: 0,
                Constitution: 0,
                Intelligence: 0,
                Wisdom: 0,
                Charisma: 0
            },
            abilityScores: {
                Strength: 0,
                Dexterity: 0,
                Constitution: 0,
                Intelligence: 0,
                Wisdom: 0,
                Charisma: 0
            },
            allFeatures: [],
            armor: undefined,
            armorClass: 0,
            background: undefined,
            class: [],
            features: [],
            initiative: 0,
            maxHP: 0,
            money: {
                platinum: 0,
                gold: 0,
                electrum: 0,
                silver: 0,
                copper: 0
            },
            passivePerception: 0,
            proficiencies: {
                savingThrow: [],
                initiativeBonus: [],
                skill: [],
                armor: [],
                tool: [],
                weapon: [],
                weaponType: []
            },
            proficiencyBonus: 0,
            race: new Reference(""),
            reference: new Reference(""),
            savingThrows: {
                Strength: 0,
                Dexterity: 0,
                Constitution: 0,
                Intelligence: 0,
                Wisdom: 0,
                Charisma: 0
            },
            skills: {
                Athletics: 0,
                Acrobatics: 0,
                "Sleight of Hand": 0,
                Stealth: 0,
                Arcana: 0,
                History: 0,
                Investigation: 0,
                Nature: 0,
                Religion: 0,
                "Animal Handling": 0,
                Insight: 0,
                Medicine: 0,
                Perception: 0,
                Survival: 0,
                Deception: 0,
                Intimidation: 0,
                Performance: 0,
                Persuasion: 0
            },
            speed: 0,
            weapons: []

        }

        return html`
            <div>
                ${character}
            </div>
        `
    }

}