import {Widget} from "@/view/widget/Widget";
import {DataView} from "@/model/Dataview";
import {Spell} from "@/model/Spell";
import {SpellViewModel} from "@/viewModel/SpellViewModel";
import {Container} from "@/view/widget/Container";
import {Table} from "@/view/widget/Table";
import {Section} from "@/view/widget/Section";
import {Checkbox} from "@/view/widget/Checkbox";

export class SpellView extends Widget {

    spellViewModel: SpellViewModel;

    constructor({ spell }: { spell: Spell[] }) {
        super();
        this.spellViewModel = new SpellViewModel(spell);
    }

    renderIn(dv: DataView): void {
        const spellByLevel = Object.groupBy(this.spellViewModel.spells, spell => spell.level);

        const preparedCheckboxes = Object.fromEntries(this.spellViewModel.spells.map(spell => [spell.reference.path, new Checkbox()]));

        this.spellViewModel.prepared.subscribe({
            next: prepared => Object.entries(preparedCheckboxes).forEach(([path, checkbox]) => {
                checkbox.value = prepared.has(path);
            })
        });

        const spellTables = Object.entries(spellByLevel)
            .filter((item): item is [string, Spell[]] => Array.isArray(item[1]))
            .map(([level, spells]) => new Section({ level: 4, header: Number(level) === 0? "Cantrips" : `Level ${level} spells` }, [
                new Table(["Prepared", "Entry", "Casting Time", "Duration", "Range", "Components", "School"] as const, spells.map(spell => [
                    preparedCheckboxes[spell.reference.path].container,
                    spell.reference.toString(),
                    spell.castingTime,
                    spell.duration,
                    spell.range,
                    spell.components.join(", "),
                    spell.school
                ]))
            ]));
        new Container(spellTables).renderIn(dv);
    }

}