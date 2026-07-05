import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_PIN_TAG_NAME = "qm-pin";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Purely decorative map-pin glyph (a rotated teardrop) used next to a location's address.
 * Always self-applies `aria-hidden="true"` on the host in `connectedCallback` — same
 * pattern as `qm-skeleton` — so it's never exposed to assistive tech even if a consumer
 * forgets to set it explicitly.
 */
export class QmPin extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  size = "22px";

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("aria-hidden", "true");
  }

  render() {
    return html`
      <span part="shape" class="shape" aria-hidden="true" style="width: ${this.size}; height: ${this.size}"></span>
    `;
  }
}

export function defineQmPin() {
  if (!customElements.get(QM_PIN_TAG_NAME)) {
    customElements.define(QM_PIN_TAG_NAME, QmPin);
  }
}

export type QmPinArgs = Partial<Pick<QmPin, "size">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-pin": QmPin;
  }
}
