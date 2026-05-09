import {Widget} from "@/model/render/Widget";
import {DataView} from "@/model/Dataview";
import {Container} from "@/model/render/Container";

export class Section extends Container {
    readonly header: string;
    readonly level: number;

    constructor(props: { header: string, level: number }, items: Widget[]) {
        super(items);
        this.header = props.header;
        this.level = props.level;
    }

    override renderIn(dv: DataView) {
        dv.header(this.level, this.header);
        this.items.forEach((content) => content.renderIn(dv));
        dv.span("-----");
    }
}