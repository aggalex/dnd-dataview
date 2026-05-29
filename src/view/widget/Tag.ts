import {Widget} from "@/view/widget/Widget";
import {DataView} from "@/model/Dataview";

export class Tag extends Widget {

    constructor(readonly tag: string, readonly value: unknown) {
        super();
    }

    override renderIn(dv: DataView) {
        dv.span(`[${this.tag}:: ${this.value}]`);
    }

}