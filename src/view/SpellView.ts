import {Widget} from "@/view/widget/Widget";
import {DataView} from "@/model/Dataview";
import {Spell} from "@/model/Spell";
import {SpellViewModel} from "@/viewModel/SpellViewModel";
import {Container} from "@/view/widget/Container";
import {Table} from "@/view/widget/Table";
import {Section} from "@/view/widget/Section";
import {Checkbox} from "@/view/widget/Checkbox";
import {Button} from "@/view/widget/Button";

export class SpellView extends Widget {

    spellViewModel: SpellViewModel;

    constructor({ spell }: { spell: Spell[] }) {
        super();
        this.spellViewModel = new SpellViewModel(spell);
    }

    renderIn(dv: DataView): void {
        const spells = this.spellViewModel.spells;
        const spellByLevel = Object.groupBy(spells, spell => spell.level);

        const preparedCheckboxes = Object.fromEntries(spells.map(spell => [spell.reference.path, {
            checkbox: new Checkbox({ onChange: value => this.spellViewModel.prepare(spell.reference, value) }),
            castButton: new Button({ text: "Cast" })
        }]));

        const subscription = this.spellViewModel.prepared.subscribe({
            next: prepared => Object.entries(preparedCheckboxes).forEach(([path, { checkbox, castButton }]) => {
                checkbox.value = prepared.has(path);
                castButton.disabled = !checkbox.value;
            })
        });

        dv.container.addEventListener("beforeunload", () => {
            subscription.unsubscribe();
        })

        const spellTables = Object.entries(spellByLevel)
            .filter((item): item is [string, Spell[]] => Array.isArray(item[1]))
            .map(([level, spells]) => new Section({ level: 4, header: Number(level) === 0? "Cantrips" : `Level ${level} spells` }, [
                new Table(["Prepared", "Entry", ""] as const, spells.map(spell => [
                    preparedCheckboxes[spell.reference.path].checkbox,
                    `${spell.reference}`,
                    preparedCheckboxes[spell.reference.path].castButton
                ]))
            ]));

        new Container(spellTables).renderIn(dv);
    }

}