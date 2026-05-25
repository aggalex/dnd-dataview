import {DataView} from "@/model/Dataview";
import {Controller} from "@/controller/Controller";
import {Callout, CalloutType, Collapsible} from "@/model/render/Collapsible";

export class Logger extends Controller {

    constructor(dv: DataView, readonly cls: string) {
        super(dv);
    }

    private format(object: object | null) {
        const json = JSON.stringify(object, null, 2);
        return "\n```json\n" + json + "\n```\n"
    }

    log(...contents: unknown[]) {
        return this.#log('note', ...contents);
    }

    warning(...contents: unknown[]) {
        return this.#log('warning', ...contents);
    }

    error(...contents: unknown[]) {
        return this.#log('failure', ...contents);
    }

    #log(type: CalloutType, ...contents: unknown[]) {
        const stack = new Error().stack;

        const joinedContents = contents.map(item => {
            switch (typeof item) {
                case "string":
                    return item;
                case "bigint":
                case "number":
                    return `*${item}*`
                case "boolean":
                    return `\`${item}\``
                case "object":
                    return this.format(item);
            }
        }).join(" ");

        new Callout({ type }, [
            joinedContents,
            new Collapsible({ title: "From " + this.cls }, ["```\n" + stack + "\n```"])
        ]).renderIn(this.dv)
    }

}