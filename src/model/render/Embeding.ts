import {Reference as Ref, DataView} from "@/model/Dataview";
import {Widget} from "@/model/render/Widget";

export class Embedding extends Widget {
    constructor(readonly reference: Ref) {
        super();
    }

    renderIn(dv: DataView): void {
        dv.paragraph(`!${this.reference}`);
    }
}