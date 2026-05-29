import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {CalculatedCharacter} from "@/model/Character";
import {ViewElement} from "@/view/ViewElement";
import {Ability} from "@/model/Abilities";

@customElement("character-view")
export class CharacterView extends ViewElement {

    static styles = css`
        .ability-container {
            grid-row: 1 / span 5;
        }
        
        .column {
            display: flex;
            flex-direction: column;
            gap: 1em;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 2fr 2fr;
            grid-template-rows: auto auto auto auto auto;
            gap: 1em;
            padding: .2em;
        }
    `

    @property({ type: Object, attribute: false })
    character?: CalculatedCharacter

    render() {
        if (!this.character) {
            return html`Loading...`;
        }

        return html`
            <div class="grid">
                <div class="ability-container column">
                    ${Object.entries(this.character.abilityScores).map(([key, value]) => html`
                        <ability-score modifier=${this.character?.abilityChecks[key as Ability] ?? 0} value="${value}" label="${key}"></ability-score>
                    `)}
                </div>
                <div class="column">
                    <span><input type="checkbox" id="inspiration"><label for="inspiration">Inspiration</label></span>
                    <span>Proficiency Bonus: <b>${this.character.proficiencyBonus}</b></span>
                </div>
            </div>
        `
    }

}