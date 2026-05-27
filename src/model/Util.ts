import {z} from "zod";

export const coerce = {
    array<T extends z.ZodTypeAny>(item: T) {
        return z.array(item).or(item.transform(a => [a])).default([])
    }
}

export function isNotNull<U>(item: U): item is NonNullable<U> {
    return item != null;
}