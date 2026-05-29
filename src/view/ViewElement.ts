import {css, html, LitElement} from "lit";

export class ViewElement extends LitElement {

    static styles = css`
        :host {
            display: contents;
        }

        .native {
            all: inherit;
            box-sizing: border-box;
        }

        *,
        *::before,
        *::after {
            box-sizing: inherit;
        }

        input,
        button,
        select,
        textarea {
            font: inherit;
            color: inherit;
        }
    `;

}