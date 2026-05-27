import {Spell, spellComponentSchema} from "@/model/Spell";
import {Repository, RepositoryResult} from "./Repository";
import {z} from "zod";
import {Reference} from "@/model/Dataview";
import {coerce, isNotNull} from "@/model/Util";

export class SpellRepository extends Repository<Spell> {

    override required = z.looseObject({
        school: z.string(),
        range: z.string(),
        level: z.coerce.number().or(z.literal("cantrip").transform(() => 0)),
        castingTime: z.string(),
        components: z.preprocess(
            value => typeof value === 'string'? [...value]: value,
            z.array(spellComponentSchema)
        ),
        duration: z.string(),
        "spell list": coerce.array(Reference.schema),
    })
        .and(this.reference)
        .transform(({"spell list": spellList, ...props}) => ({...props, spellList}))

    async findByClass(cls: Reference): Promise<RepositoryResult<Spell[]>> {
        const { value: { values } } = await this.dv.query(`LIST FROM "Spells" WHERE contains(flat(list(row["spell list"])), ${cls})`);

        return RepositoryResult.of(values.map(ref => this.getByReference(ref)).filter(isNotNull))
    }


}