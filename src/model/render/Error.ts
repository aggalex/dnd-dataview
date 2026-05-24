import {Widget} from "@/model/render/Widget";
import {ModelError} from "@/model/Error";
import {DataView} from "@/model/Dataview";

export class ErrorSection extends Widget {

    constructor(readonly error: ModelError) {
        super();
    }

    renderIn(dv: DataView): void {
        const {level, title, message} = this.error;
        const tag = ({
            Error: "failure",
            Warning: "warning"
        })[level ?? "Error"];

        dv.paragraph(`
> [!${tag}] ${title}
> 
> ${message.trim().replaceAll("\n", "\n> ")}	
		`);
    }

}