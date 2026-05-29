import {HTMLWidget} from "@/view/widget/Widget";
import {html, TemplateResult} from "lit-html";

export class Button extends HTMLWidget {

    readonly onClick: () => void;
    readonly text: string;
    #disabled: boolean;

    get disabled(): boolean {
        return this.#disabled;
    }

    set disabled(value: boolean) {
        this.#disabled = value;
        this.rerender();
    }

    constructor({ onClick = () => {}, text, disabled = false }: { onClick?: () => void, text: string, disabled?: boolean }) {
        super();
        this.onClick = onClick;
        this.text = text;
        this.#disabled = disabled;
    }

    render(): TemplateResult {
        return html`
            <button @click=${this.onClick.bind(this)} ?disabled=${this.disabled}>${this.text}</button>
        `;
    }

}