import {DataView} from "@/model/Dataview";
import {HTMLWidget, Widget} from "@/view/widget/Widget";

export type RowOf<Columns> = { readonly [k in keyof Columns]: HTMLWidget | unknown } & (readonly unknown[]);

export class Table<Columns extends string[] = string[]> extends Widget {

    constructor(readonly columns: Columns, readonly rows: RowOf<Columns>[]) {
        super();
    }

    override renderIn(dv: DataView) {
        dv.table(
            this.columns,
            this.rows.map(row => row.map(cell => cell instanceof HTMLWidget? cell.intoElement() : cell)));
    }

}


