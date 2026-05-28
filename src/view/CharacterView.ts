import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {CalculatedCharacter} from "@/model/Character";

@customElement("character-view")
export class CharacterView extends LitElement {

    static styles = css`
        .ability-container {
            display: flex;
            flex-direction: column;
            gap: 1em;
            max-width: 10em;
        }
    `

    @property()
    character?: CalculatedCharacter

    render() {
        if (!this.character) {
            return html`Loading...`;
        }

        return html`
            <div class="ability-container">
                ${Object.entries(this.character.abilityScores).map(([key, value]) => html`
                    <ability-score value="${value}" label="${key}"></ability-score>
                `)}
            </div>
        `
    }

}