import {Repository, DataViewQuery} from "@/repository/Repository";
import {Armor, armorSchema, Weapon, weaponSchema} from "@/model/Equipment";
import {Page} from "@/model/Dataview";

export class ArmorRepository extends Repository<Armor> {
    parse(page: Page) {
        return new DataViewQuery({
            required: armorSchema
        })
            .transform(armor => ({ ...armor, reference: page.file.link }))
            .parse(page);
    }
}

export class WeaponRepository extends Repository<Weapon> {
    parse(page: Page) {
        return new DataViewQuery({
            required: weaponSchema
        })
            .transform(weapon => ({...weapon, reference: page.file.link}))
            .parse(page);
    }
}