import {DataView} from "@/model/Dataview";
import {Widget} from "@/model/render/Widget";

export type RowOf<Columns> = { readonly [k in keyof Columns]: unknown } & (readonly unknown[]);

export class Table<Columns extends string[] = string[]> extends Widget {

    constructor(readonly columns: Columns, readonly rows: RowOf<Columns>[]) {
        super();
    }

    override renderIn(dv: DataView) {
        dv.table(this.columns, this.rows)
    }

}


