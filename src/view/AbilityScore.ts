import {customElement, property} from 'lit/decorators.js';
import {css, html} from "lit";
import {ViewElement} from "@/view/ViewElement";

@customElement('ability-score')
export class AbilityScore extends ViewElement {

    static styles = css`
        .ability-score {
            border: 1px solid var(--background-modifier-border);
            border-radius: 2em;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: .2em;
            padding: 0.5em;
            font-family: inherit;
        }
        
        .title {
            font-size: calc(var(--font-ui-large) * 2);
        }
    `

    @property()
    modifier: number = NaN;

    @property()
    value: number = NaN;

    @property()
    label: string = 'Unknown';

    get signedModifier() {
        if (this.modifier > 0) {
            return `+${this.modifier}`;
        } else {
            return `${this.modifier}`;
        }
    }

    protected render(): unknown {
        return html`
            <div class="ability-score">
                <span class="title">${this.signedModifier}</span>
                <span>${this.label}: <b>${this.value}</b></span>
            </div>
        `
    }

}