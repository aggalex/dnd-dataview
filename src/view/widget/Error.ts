import {ModelError} from "@/model/Error";
import {Callout} from "@/view/widget/Collapsible";

export class ErrorSection extends Callout {

    constructor(readonly error: ModelError) {
        const {level, title, message} = error;
        const tag = ({
            Error: "failure",
            Warning: "warning"
        } as const)[level ?? "Error"];
        super({ type: tag, title }, [message.trim()]);
    }

}