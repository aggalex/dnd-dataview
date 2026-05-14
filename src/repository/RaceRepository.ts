import {Repository} from "@/repository/Repository";
import {Race, sizeSchema} from "@/model/Race";
import {pageSchema, referenceSchema} from "@/model/Dataview";
import {coerce} from "@/model/Util";
import {z} from "zod";
import {Hierarchical, HierarchyResolver, resolveHierarchy} from "@/model/Hierarchical";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {ProficiencyIndex} from "@/model/Proficiency";

const raceSchema = z.looseObject({
    "Feature": coerce.array(referenceSchema),
    "Language": coerce.array(referenceSchema),
    "Speed": z.coerce.number().optional().default(30),
    "Size": sizeSchema.optional().default("Medium"),
    "Trait": coerce.array(referenceSchema),
});

const raceHierarchyResolver: HierarchyResolver<Race> = (race, parent): Race => {
    return {
        features: [...race.features, ...parent.features ?? []],
        languages: [...race.languages, ...parent.languages ?? []],
        proficiencies: new ProficiencyIndex(race.proficiencies, ...(parent.proficiencies? [parent.proficiencies]: [])),
        reference: race.reference,
        size: race.size ?? parent.size,
        speed: race.speed ?? parent.speed,
        traits: [...race.traits, ...parent.traits ?? []],
    }
}

export class RaceRepository extends Repository<Hierarchical<Race>> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);

    override readonly required = raceSchema
        .extend({
            inherit: referenceSchema.optional().transform((ref, ctx) =>
                ref ? this.getByReference(ref)
                    ?.mapErr(err => err.issues.forEach(issue => ctx.addIssue(issue as (typeof issue & Record<string, unknown>))))
                    .unwrapOrElse(() => undefined)
                    : undefined
            ),
            override: coerce.array(raceSchema.keyof()),
        })
        .and(this.reference)
        .and(this.proficiencyRepository.required.transform(proficiencies => ({ proficiencies })))
        .transform(race => ({
            features: race.Feature,
            languages: race.Language,
            speed: race.Speed,
            size: race.Size,
            traits: race.Trait,
            proficiencies: race.proficiencies,
            reference: race.reference,
            inherit: race.inherit?.output,
            overrides: race.override.map(key => ({
                "Feature": "features",
                "Language": "languages",
                "Speed": "speed",
                "Size": "size",
                "Trait": "traits"
            } as const)[key])
        } satisfies Hierarchical<Race>))
        .transform(race => {
            const hierarchy = [];
            let current: Hierarchical<Race> | undefined = race;
            do {
                hierarchy.push(current);
            } while (current = current.inherit);
            return hierarchy.reverse().reduce((parent, child) => {
                for (const key of child.overrides ?? []) {
                    delete parent[key];
                }
                return raceHierarchyResolver(child, parent)
            }) ?? race;
        });

    override readonly warnings = z.looseObject({
        "Speed": z.coerce.number(),
        "Size": sizeSchema,
    });

}