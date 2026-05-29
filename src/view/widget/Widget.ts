import {DataView} from "@/model/Dataview";

export abstract class Widget {

    abstract renderIn(dv: DataView): void;

}