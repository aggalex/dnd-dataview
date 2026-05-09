import {DataViewQuery, Repository, RepositoryResult} from "@/repository/Repository";
import {Character, CharacterClass, Money} from "@/model/Character";
import {Page, referenceSchema} from "@/model/Dataview";
import {z} from "zod";
import {coerce} from "@/model/Util";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {AbilityBonusRepository, AbilityRollRepository} from "@/repository/AbilityRepository";

export class CharacterRepository extends Repository<Character> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);
    private readonly abilityRollRepository = new AbilityRollRepository(this.dv);
    private readonly abilityBonusRepository = new AbilityBonusRepository(this.dv);

    private readonly characterClassSchema = z.tuple([referenceSchema, z.number(), referenceSchema.optional()] as const)
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

    readonly moneyQuery = new DataViewQuery({
        required: this.moneySchema(z.coerce.number().optional().default(0))
    })

    readonly baseCharacterQuery = new DataViewQuery({
        required: z.looseObject({
            "Class": coerce.array(this.characterClassSchema),
            "Race": referenceSchema,
            "Background": referenceSchema.optional(),
            "Armor": referenceSchema.optional(),
            "Weapon": coerce.array(referenceSchema),
            "Language": coerce.array(referenceSchema),
            "Max HP": z.coerce.number().optional().default(0),
        }), warnings: z.looseObject({
            "Background": referenceSchema, "Max HP": z.coerce.number(),
        })
    })

    parse(page: Page): RepositoryResult<Character> {

        const character = this.baseCharacterQuery.parse(page);
        const abilityRolls = this.abilityRollRepository.parse(page);
        const proficiencies = this.proficiencyRepository.parse(page);
        const money = this.moneyQuery.parse(page);

        return RepositoryResult.of([character, abilityRolls, proficiencies, money] as const)
            .map(({
                output: [character, abilityRolls, proficiencies, money],
                warnings
            }) => ({
            output: {
                reference: page.file.link,
                class: character.Class,
                race: character.Race,
                background: character.Background,
                armor: character.Armor,
                weapons: character.Weapon,
                maxHP: character["Max HP"],
                money,
                abilityRolls,
                proficiencies
            } satisfies Character,
            warnings
        }));
    }
}