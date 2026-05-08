import {ModelError, ModelErrorContainer} from "@/model/Error";
import {DataView} from "@/model/Dataview";

export class RenderController {

    constructor(
        public dv: DataView
    ) {
    }

    renderErrors(errors: ModelError[] | ModelErrorContainer) {
        const errorArray = Array.isArray(errors)? errors: errors.getErrors();

        errorArray.forEach(error => {
            this.renderError(error);
            this.dv.el("br");
        });
    }

    renderError({level, title, message}: ModelError) {
        const tag = ({
            Error: "failure",
            Warning: "warning"
        })[level ?? "Error"];

        this.dv.span(`
> [!${tag}] ${title}
> ${message.replace("\n", "\n> ")}	
		`);
    }

}
