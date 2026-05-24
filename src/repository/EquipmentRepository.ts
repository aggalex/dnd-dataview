import {Repository} from "@/repository/Repository";
import {Armor, armorSchema, Weapon, weaponSchema} from "@/model/Equipment";
import {pageSchema} from "@/model/Dataview";

export class ArmorRepository extends Repository<Armor> {
    override required = armorSchema.and(
        pageSchema.transform(({file}) => ({reference: file.link}))
    );
}

export class WeaponRepository extends Repository<Weapon> {
    override required = weaponSchema.and(
        pageSchema.transform(({file}) => ({reference: file.link}))
    );
}