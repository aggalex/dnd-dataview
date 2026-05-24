import {DataView} from "@/model/Dataview";
import {ModelError, ModelErrorContainer} from "@/model/Error";
import {Controller} from "@/controller/Controller";
import {ErrorViewModel} from "@/viewModel/ErrorViewModel";
import {ErrorSection} from "@/model/render/Error";

export class RenderController extends Controller {

    constructor(dv: DataView, protected readonly errorViewModel: ErrorViewModel) {
        super(dv);
    }


    signed(n?: number) {
        if (n == null) {
            return n;
        } else if (n > 0) {
            return `+${n}`
        } else {
            return `${n}`
        }
    }

    renderErrors() {
        const errors = this.errorViewModel.errors;
        const errorArray: ModelError[] = Array.isArray(errors)? errors: errors.getErrors();

        errorArray.forEach(error => new ErrorSection(error).renderIn(this.dv));
    }

}
