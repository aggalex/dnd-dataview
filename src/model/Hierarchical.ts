import {Reference} from "@/model/Dataview";

export type Hierarchical<Item> = Item & {
    overrides?: (keyof Item)[];
    inherit?: Reference
}