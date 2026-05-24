import {Reference as Ref, DataView} from "@/model/Dataview";
import {Widget} from "@/model/render/Widget";

export class Embedding extends Widget {
    constructor(readonly reference: Ref) {
        super();
    }

    renderIn(dv: DataView): void {
        const path = typeof this.reference === "string"? this.reference : this.reference.path;
        const displayName = typeof this.reference === "object"? this.reference.display: undefined;

        dv.fileLink(path, true, displayName);
    }
}