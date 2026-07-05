import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_ALLERGEN_TAG_NAME = "qm-allergen";

const componentStyles = createComponentStyles(componentStylesText);

/** Read-only allergen label (e.g. "Gluten", "Lácteos"), meant to be repeated in a dish's allergen list. */
export class QmAllergen extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  label = "";

  render() {
    return html`
      <span part="allergen" class="allergen">
        <span class="icon" part="icon"><slot name="icon" aria-hidden="true"></slot></span>
        <span class="label" part="label">${this.label}</span>
      </span>
    `;
  }
}

export function defineQmAllergen() {
  if (!customElements.get(QM_ALLERGEN_TAG_NAME)) {
    customElements.define(QM_ALLERGEN_TAG_NAME, QmAllergen);
  }
}

export type QmAllergenArgs = Partial<Pick<QmAllergen, "label">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-allergen": QmAllergen;
  }
}
