import {Repository} from "@/repository/Repository";
import {CompositeRace, Race, sizeSchema} from "@/model/Race";
import {coerce} from "@/model/Util";
import {z} from "zod";
import {Hierarchical, HierarchyResolver} from "@/model/Hierarchical";
import {ProficiencyRepository} from "@/repository/ProficiencyRepository";
import {Page, Reference} from "@/model/Dataview";
import {AbilityBonusRepository} from "@/repository/AbilityRepository";
import {ABILITIES} from "@/model/Abilities";
import {ProficiencyIndex} from "@/model/Proficiency";

const raceSchema = z.looseObject({
    "Feature": coerce.array(Reference.schema),
    "Language": coerce.array(Reference.schema),
    "Speed": z.coerce.number().optional().default(30),
    "Size": sizeSchema.optional().default("Medium"),
    "Trait": coerce.array(Reference.schema),
    "Spell": coerce.array(Reference.schema),
});

const raceHierarchyResolver: HierarchyResolver<CompositeRace> = (race, parent) => {
    return {
        features: [...race.features, ...parent.features ?? []],
        languages: [...race.languages, ...parent.languages ?? []],
        proficiencies: new ProficiencyIndex(race.proficiencies, ...(parent.proficiencies? [parent.proficiencies]: [])),
        abilityBonus: race.abilityBonus,
        reference: race.reference,
        size: race.size ?? parent.size,
        speed: race.speed ?? parent.speed,
        traits: [...race.traits, ...parent.traits ?? []],
        spells: [...race.spells, ...parent.spells ?? []],
        abilityBonusProviders: [...race.abilityBonusProviders, ...(parent.abilityBonusProviders ?? [])],
    }
}

export class RaceRepository extends Repository<CompositeRace> {

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
            spells: race.Spell,
            proficiencies: race.proficiencies,
            abilityBonus: race.abilityBonuses,
            reference: race.reference,
            inherit: race.inherit?.output,
            overrides: race.override.map(key => ({
                "Feature": "features",
                "Language": "languages",
                "Speed": "speed",
                "Size": "size",
                "Trait": "traits",
                "Spell": "spells",
            } as const)[key])
        } satisfies Hierarchical<Race>))
        .transform(race => {
            const compositeRace: CompositeRace = {
                ...race,
                abilityBonusProviders: [{ reference: race.reference, abilityBonus: race.abilityBonus }]
            };
            if (race.inherit) {
                const parent = Object.create(race.inherit);
                for (const key in race.overrides) {
                    parent[key] = undefined;
                }
                return raceHierarchyResolver(compositeRace, parent);
            }
            return compositeRace;
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