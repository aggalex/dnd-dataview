import {Widget} from "@/view/widget/Widget";
import {DataView} from "@/model/Dataview";
import {html, render} from "lit-html";

export class Checkbox extends Widget {

    onChange?: (value: boolean) => void;
    #value: boolean;
    container!: HTMLElement;

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

    renderIn(dv: DataView) {
        this.container = dv.el("span");
        dv.paragraph("Rendering Checkbox " + this.value);
        this.#render();
    }

    #render() {
        this.container.innerHTML = ""
        render(html`
            <input type="checkbox" @change="${(ev: Event & { target: HTMLInputElement }) => this.value = ev.target.checked}">
        `, this.container);
    }

}