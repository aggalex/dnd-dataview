import {Repository} from "@/repository/Repository";
import {Proficiency, ProficiencyIndex} from "@/model/Proficiency";
import {referenceSchema, pageSchema, Reference} from "@/model/Dataview";
import {z} from "zod";
import {abilitySchema, Skill, skillSchema} from "@/model/Abilities";

function proficiencyPropertySchema<T extends z.ZodType>(valueSchema: T) {
    return z.array(valueSchema).or(valueSchema)
        .transform((item): z.infer<T>[] => Array.isArray(item) ? item : [item])
        .default([])
}

function arrayOrUndefined<T>(arr: T[]): T[] | undefined {
    return arr.length > 0? arr: undefined;
}

export class ProficiencyRepository extends Repository<ProficiencyIndex> {
    readonly metadata = z.registry<{ tag: "Proficiency" | "Expertise" }>();

    readonly schema = z.looseObject({
        "Saving Throw Proficiency": proficiencyPropertySchema(abilitySchema),
        "Initiative Bonus": proficiencyPropertySchema(z.coerce.number()),
        "Skill Proficiency": proficiencyPropertySchema(skillSchema),
        "Skill Expertise": proficiencyPropertySchema(skillSchema).register(this.metadata, { tag: "Expertise" }),
        "Armor Proficiency": proficiencyPropertySchema(z.string()),
        "Tool Proficiency": proficiencyPropertySchema(referenceSchema),
        "Weapon Proficiency": proficiencyPropertySchema(referenceSchema),
        "Weapon Type Proficiency": proficiencyPropertySchema(z.string()),
    });

    private buildProficiencyArray<Prop extends ReturnType<typeof this.schema.keyof>["options"][number], T>(
        index: Record<Prop, T[]>,
        prop: Prop,
        ref: Reference
    ): Proficiency<T>[] | undefined {
        const proficiencies = index[prop]
            .filter(a => a != null)
            .map(item => ({
                item: item,
                type: this.metadata.get((this.schema.shape)[prop])?.tag ?? "Proficiency",
                justification: ref,
            }))

        return arrayOrUndefined(proficiencies);
    }

    readonly required = this.schema.transform(proficiencyIndex => ({proficiencyIndex}))
        .and(this.reference)
        .transform(({ proficiencyIndex, reference }): ProficiencyIndex => new ProficiencyIndex({
            savingThrow: this.buildProficiencyArray(proficiencyIndex, "Saving Throw Proficiency", reference),
            initiativeBonus: this.buildProficiencyArray(proficiencyIndex, "Initiative Bonus", reference),
            skill: arrayOrUndefined([
                ...this.buildProficiencyArray<"Skill Proficiency", Skill>(proficiencyIndex, "Skill Proficiency", reference) ?? [],
                ...this.buildProficiencyArray<"Skill Expertise", Skill>(proficiencyIndex, "Skill Expertise", reference) ?? []
            ]),
            armor: this.buildProficiencyArray(proficiencyIndex, "Armor Proficiency", reference),
            tool: this.buildProficiencyArray(proficiencyIndex, "Tool Proficiency", reference),
            weapon: this.buildProficiencyArray(proficiencyIndex, "Weapon Proficiency", reference),
            weaponType: this.buildProficiencyArray(proficiencyIndex, "Weapon Type Proficiency", reference),
        }))
}