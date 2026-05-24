import {Repository} from "@/repository/Repository";
import {Character, CharacterClass, Money} from "@/model/Character";
import {Reference} from "@/model/Dataview";
import {z} from "zod";
import {coerce} from "@/model/Util";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {AbilityRollRepository} from "@/repository/AbilityRepository";

export class CharacterRepository extends Repository<Character> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);
    private readonly abilityRollRepository = new AbilityRollRepository(this.dv);

    private readonly characterClassSchema = z.tuple([Reference.schema, z.number(), Reference.schema.optional()] as const)
        .transform(([cls, level, subclass]): CharacterClass => ({
            class: cls, level, subclass
        }));

    moneySchema(value: z.ZodType<number>): z.ZodType<Money> {
        return z.looseObject({
            Platinum: value, Gold: value, Electrum: value, Silver: value, Copper: value,
        }).transform((item): Money => ({
            platinum: item.Platinum, gold: item.Gold, electrum: item.Electrum, silver: item.Silver, copper: item.Copper,
        }))
    }

    readonly required = z.looseObject({
        "Class": coerce.array(this.characterClassSchema),
        "Race": Reference.schema,
        "Background": Reference.schema.optional(),
        "Armor": Reference.schema.optional(),
        "Weapon": coerce.array(Reference.schema),
        "Language": coerce.array(Reference.schema),
        "Max HP": z.coerce.number().optional().default(0),
        "Feature": coerce.array(Reference.schema),
    })
        .and(this.abilityRollRepository.required.transform(abilityRolls => ({ abilityRolls })))
        .and(this.proficiencyRepository.required.transform(proficiencies => ({ proficiencies })))
        .and(this.moneySchema(z.coerce.number().optional().default(0)).transform(money => ({ money })))
        .and(this.reference)
        .transform(character => {
            const { money, proficiencies, abilityRolls, reference } = character;
            return {
                reference,
                class: character.Class,
                race: character.Race,
                background: character.Background,
                armor: character.Armor,
                weapons: character.Weapon,
                features: character.Feature,
                maxHP: character["Max HP"],
                money,
                abilityRolls,
                proficiencies,
            } satisfies Character
        })

    readonly warnings = z.looseObject({
        "Background": Reference.schema,
        "Max HP": z.coerce.number(),
    })
}