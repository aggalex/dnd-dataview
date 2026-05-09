import {Repository, DataViewQuery, RepositoryResult} from "@/repository/Repository";
import {Proficiency} from "@/model/Proficiency";
import {Page, referenceSchema, Reference} from "@/model/Dataview";
import {z} from "zod";
import {Ability, abilitySchema, Skill, skillSchema} from "@/model/Abilities";

abstract class BaseProficiencyRepository<P> extends Repository<Proficiency<P>[]> {
    abstract readonly propertyName: string;
    abstract readonly valueSchema: z.ZodType<P>;
    readonly tag: "Proficiency" | "Expertise" = "Proficiency";

    override parse(page: Page) {
        return new DataViewQuery({
            required: z.looseObject({
                [this.propertyName]: z.array(this.valueSchema).or(this.valueSchema)
                    .transform((item): P[] => Array.isArray(item) ? item : [item])
                    .default([])
            })
        })
            .transform(({[this.propertyName]: p}) => p.map(item => ({
                item,
                type: this.tag,
                justification: page.file.link,
                property: this.propertyName,
            })))
            .parse(page)
    }

    isType(proficiency: Proficiency<unknown>): proficiency is Proficiency<P> {
        return proficiency.property === this.propertyName;
    }
}

export class SavingThrowProficiencyRepository extends BaseProficiencyRepository<Ability> {

    readonly propertyName = "Saving Throw Proficiency"
    readonly valueSchema = abilitySchema

}

export class InitiativeBonusRepository extends BaseProficiencyRepository<number> {

    readonly propertyName = "Initiative Bonus"
    readonly valueSchema = z.coerce.number()

}

export class SkillProficiencyRepository extends BaseProficiencyRepository<Skill> {

    readonly propertyName = "Skill Proficiency"
    readonly valueSchema = skillSchema

}

export class SkillExpertiseRepository extends BaseProficiencyRepository<Skill> {

    readonly propertyName = "Skill Expertise"
    readonly valueSchema = skillSchema
    readonly tag = "Expertise"

}

export class ArmorProficiencyRepository extends BaseProficiencyRepository<string> {

    readonly propertyName = "Armor Proficiency"
    readonly valueSchema = z.string()

}

export class ToolProficiencyRepository extends BaseProficiencyRepository<Reference> {

    readonly propertyName = "Tool Proficiency"
    readonly valueSchema = referenceSchema

}

export class WeaponProficiencyRepository extends BaseProficiencyRepository<Reference> {

    readonly propertyName = "Weapon Proficiency"
    readonly valueSchema = referenceSchema

}

export class WeaponTypeProficiencyRepository extends BaseProficiencyRepository<string> {

    readonly propertyName = "Weapon Type Proficiency"
    readonly valueSchema = z.string()

}

export class ProficiencyRepository extends Repository<Proficiency<unknown>[]> {
    readonly proficiencyRepositories: BaseProficiencyRepository<unknown>[] = [
        new SavingThrowProficiencyRepository(this.dv),
        new SkillProficiencyRepository(this.dv),
        new SkillExpertiseRepository(this.dv),
        new ArmorProficiencyRepository(this.dv),
        new ToolProficiencyRepository(this.dv),
        new WeaponProficiencyRepository(this.dv),
        new WeaponTypeProficiencyRepository(this.dv),
        new InitiativeBonusRepository(this.dv)
    ]

    parse(page: Page): RepositoryResult<Proficiency<unknown>[]> {
        const results = this.proficiencyRepositories.map(repo => repo.parse(page));
        return RepositoryResult.combine(...results);
    }

}