import {DataView} from "@/model/Dataview";
import {TemplateResult, render} from "lit-html";

export abstract class Widget {

    abstract renderIn(dv: DataView): void;

}

export abstract class HTMLWidget extends Widget {

    override renderIn(dv: DataView) {
        this.parent = dv.el("div");
        this.renderInNode(this.parent);
    }

    abstract render(): TemplateResult;

    parent?: HTMLElement;

    rerender() {
        if (this.parent) {
            this.renderInNode(this.parent);
        }
    }

    intoElement() {
        const container = document.createElement('div');
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
        container.style.width = "auto";
        container.style.height = "auto";
        this.parent = container;
        this.renderInNode(container);
        return container;
    }

    private renderInNode(el: HTMLElement) {
        render(this.render(), el);
    }
}