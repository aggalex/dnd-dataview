import {Widget} from "@/model/render/Widget";
import {DataView, Reference} from "@/model/Dataview";

export class Embed extends Widget {
    constructor(readonly reference: Reference) {
        super();
    }

    override renderIn(dv: DataView) {
        dv.span(typeof this.reference == 'string' ? `[[${this.reference}]]` : this.reference)
    }
}