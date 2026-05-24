import {Repository} from "@/repository/Repository";
import {Race, sizeSchema} from "@/model/Race";
import {coerce} from "@/model/Util";
import {z} from "zod";
import {Hierarchical, HierarchyResolver} from "@/model/Hierarchical";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {ProficiencyIndex} from "@/model/Proficiency";
import {Page, Reference} from "@/model/Dataview";
import {AbilityBonusRepository} from "@/repository/AbilityRepository";
import {ABILITIES, Ability} from "@/model/Abilities";

const raceSchema = z.looseObject({
    "Feature": coerce.array(Reference.schema),
    "Language": coerce.array(Reference.schema),
    "Speed": z.coerce.number().optional().default(30),
    "Size": sizeSchema.optional().default("Medium"),
    "Trait": coerce.array(Reference.schema),
});

const raceHierarchyResolver: HierarchyResolver<Race> = (race, parent): Race => {
    return {
        features: [...race.features, ...parent.features ?? []],
        languages: [...race.languages, ...parent.languages ?? []],
        proficiencies: new ProficiencyIndex(race.proficiencies, ...(parent.proficiencies? [parent.proficiencies]: [])),
        abilityBonus: Object.fromEntries(ABILITIES
            .map(key => [key,
                race.abilityBonus?.[key] == null && parent.abilityBonus?.[key] == null? null
                : (race.abilityBonus?.[key] ?? 0) + (race.abilityBonus?.[key] ?? 0)])),
        reference: race.reference,
        size: race.size ?? parent.size,
        speed: race.speed ?? parent.speed,
        traits: [...race.traits, ...parent.traits ?? []],
    }
}

export class RaceRepository extends Repository<Hierarchical<Race>> {

    private readonly proficiencyRepository = new ProficiencyRepository(this.dv);
    private readonly abilityBonusRepository = new AbilityBonusRepository(this.dv);

    override readonly required = raceSchema
        .extend({
            inherit: Reference.schema.optional().transform((ref, ctx) =>
                ref ? this.getByReference(ref)
                        ?.mapErr(err => err.issues.forEach(issue => ctx.addIssue(issue as (typeof issue & Record<string, unknown>))))
                        .unwrapOrElse(() => undefined)
                    : undefined
            ),
            override: coerce.array(raceSchema.keyof()),
        })
        .and(this.reference)
        .and(this.proficiencyRepository.required.transform(proficiencies => ({ proficiencies })))
        .and(this.abilityBonusRepository.required.transform(abilityBonuses => ({ abilityBonuses })))
        .transform(race => ({
            features: race.Feature,
            languages: race.Language,
            speed: race.Speed,
            size: race.Size,
            traits: race.Trait,
            proficiencies: race.proficiencies,
            abilityBonus: race.abilityBonuses,
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
            this.dv.paragraph(`Race ${race.reference} has parent race ${race.inherit?.reference}`)
            if (race.inherit) {
                const parent = Object.create(race.inherit);
                for (const key in race.overrides) {
                    parent[key] = undefined;
                }
                const output = raceHierarchyResolver(race, parent);
                this.dv.paragraph("```json\n" + JSON.stringify(output) + "\n```")
                return output;
            }
            return race;
        });

    override readonly warnings = z.looseObject({
        "Speed": z.coerce.number(),
        "Size": sizeSchema,
    });

    override getTestedObjectForWarnings(page: Page, item: Hierarchical<Race>) {
        return {
            Speed: item.speed,
            Size: item.size,
        };
    }

}