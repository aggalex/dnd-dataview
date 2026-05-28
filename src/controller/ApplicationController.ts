import {DataView, Reference} from "@/model/Dataview";
import {CharacterLogicController} from "@/controller/CharacterLogicController";
import {RenderController} from "@/controller/RenderController";
import {ErrorViewModel} from "@/viewModel/ErrorViewModel";
import {ModelError} from "@/model/Error";
import {CharacterRepository} from "@/repository/CharacterRepository";
import {CharacterView} from "@/view/CharacterView";
import '@/view/AbilityScore';
import '@/view/CharacterView';

export class ApplicationController extends RenderController {

    constructor(
        dv: DataView,
        errorViewModel = new ErrorViewModel(),
        readonly characterRepository = new CharacterRepository(dv),
        readonly characterLogicController = new CharacterLogicController(dv, errorViewModel),
    ) {
        super(dv, errorViewModel);
    }

    async render() {
        const el = this.dv.el("test-element") as CharacterView;

        const ref = new Reference(this.dv.current().file.link.path);

        const characterRes = this.characterRepository.getByReference(ref)

        if (!characterRes) {
            this.errorViewModel.errors.add(new ModelError({
                level: "Error",
                message: `Character ${ref} does not exist`,
                section: "Character",
                title: "Character not found"
            }));
            this.renderErrors();
            return;
        }

        const character = characterRes.transform(this.errorViewModel.handle(ref, "Character"));

        if (!character) {
            this.renderErrors();
            return;
        }

        el.character = await this.characterLogicController.calculateCharacter(character);
    }

}