import {Widget} from "@/model/render/Widget";
import {DataView} from "@/model/Dataview";

export class Label extends Widget {
    constructor(public label: string) {
        super();
    }

    renderIn(dv: DataView) {
        dv.span(this.label)
    }
}