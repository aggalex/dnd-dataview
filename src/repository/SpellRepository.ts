import {Spell, spellComponentSchema} from "@/model/Spell";
import {Repository, RepositoryResult} from "./Repository";
import {z, ZodISODuration} from "zod";
import {Page, Reference} from "@/model/Dataview";
import {coerce, isNotNull} from "@/model/Util";
import {Result} from "@/model/Error";
import {Duration} from "luxon";

const durationSchema = z.string()
    .or(z.custom<Duration>(Duration.isDuration)
        .transform((duration: Duration) => duration.toHuman()))

export class SpellRepository extends Repository<Spell> {

    override required = z.looseObject({
        school: z.string(),
        range: z.string(),
        level: z.coerce.number().or(z.literal("cantrip").transform(() => 0)),
        "casting time": durationSchema,
        components: z.preprocess(
            value => typeof value === 'string'? [...value]: value,
            z.array(spellComponentSchema)
        ),
        duration: durationSchema,
        "spell list": coerce.array(Reference.schema),
    })
        .and(this.reference)
        .transform(({"spell list": spellList, "casting time": castingTime, ...props}) =>
            ({...props, spellList, castingTime}))

    async findByClass(cls: Reference): Promise<RepositoryResult<Spell[]>> {
        const { value: { values } } = await this.dv.query(`LIST FROM "Spells" WHERE contains(flat(list(row["spell list"])), ${cls})`);

        return RepositoryResult.of(values.map(ref => this.getByReference(ref)).filter(isNotNull))
    }

    findIn(page: Page): RepositoryResult<Spell[]> {
        const { data, error } = z.looseObject({
            Spell: coerce.array(Reference.schema),
        }).safeParse(page);

        if (error) {
            return Result.error(error)
        }

        return RepositoryResult.of(data.Spell.map(ref => this.getByReference(ref)).filter(isNotNull))
    }

}