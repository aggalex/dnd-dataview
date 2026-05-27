import {Repository} from "@/repository/Repository";
import {Armor, Weapon, weaponSchema} from "@/model/Equipment";
import {pageSchema} from "@/model/Dataview";
import {z} from "zod";

export class ArmorRepository extends Repository<Armor> {
    override required = z.looseObject({
            type: z.string().optional(),
            weight: z.string().optional(),
            "Base AC": z.coerce.number().optional()
        })
        .transform(({"Base AC": armorClass, ...armor}) => ({
            ...armor,
            armorClass
        }))
        .and(pageSchema.transform(({file}) => ({reference: file.link})));

    override warnings = z.looseObject({
        "Base AC": z.coerce.number()
    })
}

export class WeaponRepository extends Repository<Weapon> {
    override required = weaponSchema.and(
        pageSchema.transform(({file}) => ({reference: file.link}))
    );
}