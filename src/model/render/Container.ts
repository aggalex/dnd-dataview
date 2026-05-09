import {Widget} from "@/model/render/Widget";
import {DataView} from "@/model/Dataview";

export class Container extends Widget {
    constructor(readonly items: Widget[]) {
        super();
    }

    override renderIn(dv: DataView) {
        for (const item of this.items) {
            item.renderIn(dv);
        }
    }
}