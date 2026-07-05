import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_EYEBROW_TAG_NAME = "qm-eyebrow";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Small-caps label atom (e.g. "Cocina de mercado") for standalone use in molecules that
 * need an eyebrow without a full heading. `qm-heading` has its own internal eyebrow line —
 * this atom is not used by it, deliberately, to avoid a shadow-DOM structure change there.
 */
export class QmEyebrow extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  text = "";

  render() {
    return html`<span part="text" class="text">${this.text}</span>`;
  }
}

export function defineQmEyebrow() {
  if (!customElements.get(QM_EYEBROW_TAG_NAME)) {
    customElements.define(QM_EYEBROW_TAG_NAME, QmEyebrow);
  }
}

export type QmEyebrowArgs = Partial<Pick<QmEyebrow, "text">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-eyebrow": QmEyebrow;
  }
}
