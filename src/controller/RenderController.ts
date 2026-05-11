import {ModelError, ModelErrorContainer} from "@/model/Error";
import {Controller} from "@/controller/Controller";

export class RenderController extends Controller {

    signed(n?: number) {
        if (n == null) {
            return n;
        } else if (n > 0) {
            return `+${n}`
        } else {
            return `${n}`
        }
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
