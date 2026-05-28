import {customElement, property} from 'lit/decorators.js';
import {css, html, LitElement} from "lit";

@customElement('ability-score')
export class AbilityScore extends LitElement {

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
    value: number = 3;

    @property()
    label: string = 'Strength';

    get valueStr() {
        if (this.value > 0) {
            return `+${this.value}`;
        } else {
            return `${this.value}`;
        }
    }

    protected render(): unknown {
        return html`
            <div class="ability-score">
                <span class="title">${this.valueStr}</span>
                <span>${this.label}</span>
            </div>
        `
    }

}