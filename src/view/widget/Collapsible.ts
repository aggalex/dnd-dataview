import {Widget} from "@/view/widget/Widget";
import {DataView} from "@/model/Dataview";

export type CalloutType = 'note'
    | 'abstract'
    | 'todo'
    | 'tip'
    | 'success'
    | 'question'
    | 'warning'
    | 'failure'
    | 'danger'
    | 'bug'
    | 'example'
    | 'quote';

export type CollapseMode = 'open' | 'closed';

export class Callout extends Widget {
    readonly type: CalloutType
    readonly title: string;

    constructor(props : { title?: string, type?: CalloutType }, readonly contents: (string | Callout)[]) {
        super();
        this.title = props.title ?? "";
        this.type = props.type ?? 'note';
    }

    protected get preamble() {
        return `[!${this.type}]`
    }

    protected get text(): string {
        return (`> ${this.preamble} ${this.title}\n`
            + this.contents.map(item => item instanceof Callout? item.text: item)
                .join("\n")).replaceAll('\n', '\n> ').trim()
    }

    renderIn(dv: DataView) {
        dv.paragraph(this.text);
    }
}

export class Collapsible extends Callout {

    readonly defaultMode: CollapseMode;

    constructor(props : { title?: string, defaultMode?: CollapseMode, type?: CalloutType }, readonly contents: (string | Callout)[]) {
        super(props, contents);
        this.defaultMode = props.defaultMode ?? 'closed';
    }

    override get preamble() {
        return `[!${this.type}]${this.defaultMode === 'open' ? '+' : '-'}`;
    }

}