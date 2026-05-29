import {Widget} from "@/view/widget/Widget";
import {DataView} from "@/model/Dataview";

export class Label extends Widget {
    constructor(public label: string) {
        super();
    }

    renderIn(dv: DataView) {
        dv.span(this.label)
    }
}