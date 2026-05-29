import {Spell} from "@/model/Spell";
import {Reference} from "@/model/Dataview";
import {StringUtil} from "@/util";
import {BehaviorSubject, share} from "rxjs";

export class SpellViewModel {
    private readonly spellIndex: Record<string, Spell>
    readonly spells: Spell[] = [];

    constructor(spells: Spell[]) {
        this.spellIndex = Object.fromEntries(spells.map(spell => [spell.reference.path, spell]));
        this.spells = Object.values(this.spellIndex);
        this.spells.sort((a, b) => StringUtil.compare(a.reference.name, b.reference.name));
    }

    #prepared = new BehaviorSubject<Set<string>>(new Set<string>());

    get prepared() {
        return this.#prepared.pipe(share());
    }

    readonly onPreparedChanged = new Set<(v: Set<string>) => void>();

    prepare(ref: Reference, prepared: boolean) {
        if (prepared)
            this.#prepared.value.add(ref.path);
        else
            this.#prepared.value.delete(ref.path);
        this.#prepared.next(this.#prepared.value);
    }

}