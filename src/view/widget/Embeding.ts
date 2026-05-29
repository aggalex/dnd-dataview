import {Reference as Ref, DataView} from "@/model/Dataview";
import {Widget} from "@/view/widget/Widget";

export class Embedding extends Widget {
    constructor(readonly reference: Ref) {
        super();
    }

    renderIn(dv: DataView): void {
        dv.paragraph(`!${this.reference}`);
    }
}