import {Result} from "@/model/Error";
import {RepositoryResult} from "@/repository/Repository";

export type Hierarchical<Item> = Item & {
    overrides?: (keyof Item)[];
    inherit?: Partial<Hierarchical<Item>>;
}

export type HierarchyResolver<Item> = (item: Item, parent: Partial<Item>) => Item;

export function resolveHierarchy<Item>(item: Hierarchical<Item>, resolver: HierarchyResolver<Item>): Item {
    if (!item.inherit) {
        return item;
    }

    const parent = item.inherit;
    for (const key of item.overrides ?? []) {
        delete parent[key];
    }

    return resolver(item, parent);
}