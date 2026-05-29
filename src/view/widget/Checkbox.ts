import {HTMLWidget, Widget} from "@/view/widget/Widget";
import {html, render} from "lit-html";

export class Checkbox extends HTMLWidget {

    onChange?: (value: boolean) => void;
    #value: boolean;

    get value() {
        return this.#value;
    }

    set value(value: boolean) {
        this.#value = value;
        this.onChange?.(value);
    }

    constructor({defaultValue = false, onChange}: { defaultValue?: boolean, onChange?(value: boolean): void } = {}) {
        super();
        this.#value = defaultValue;
        this.onChange = onChange;
    }

    render() {
        return html`
            <input type="checkbox" @change="${(ev: Event & { target: HTMLInputElement }) => this.value = ev.target.checked}">
        `;
    }

}