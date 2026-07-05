import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_PRICE_TAG_NAME = "qm-price";

const componentStyles = createComponentStyles(componentStylesText);

/** Price display with an optional strikethrough old price (e.g. a discounted dish). */
export class QmPrice extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  value = "";

  @property({ type: String, attribute: "old-value" })
  oldValue?: string;

  render() {
    return html`
      ${this.oldValue ? html`<span part="old-value" class="old-value">${this.oldValue}</span>` : nothing}
      <span part="value" class="value">${this.value}</span>
    `;
  }
}

export function defineQmPrice() {
  if (!customElements.get(QM_PRICE_TAG_NAME)) {
    customElements.define(QM_PRICE_TAG_NAME, QmPrice);
  }
}

export type QmPriceArgs = Partial<Pick<QmPrice, "value" | "oldValue">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-price": QmPrice;
  }
}
