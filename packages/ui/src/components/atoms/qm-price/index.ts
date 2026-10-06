import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_PRICE_TAG_NAME = "qm-price";

const componentStyles = createComponentStyles(componentStylesText);

/** One labelled price of a dish with variants, e.g. `{ label: "15 cm", value: "4,50 €" }`. */
export interface QmPriceColumn {
  label: string;
  value: string;
  oldValue?: string;
}

/**
 * Price display with an optional strikethrough old price (e.g. a discounted dish). With a
 * `label` (a dish variant such as "15 cm") it stacks label, old price and price as a column.
 */
export class QmPrice extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  value = "";

  @property({ type: String, attribute: "old-value" })
  oldValue?: string;

  @property({ type: String, reflect: true })
  label?: string;

  render() {
    return html`
      ${this.label ? html`<span part="label" class="label">${this.label}</span>` : nothing}
      ${this.oldValue ? html`<span part="old-value" class="old-value">${this.oldValue}</span>` : nothing}
      <span part="value" class="value">${this.value}</span>
    `;
  }
}

/** Price columns for a dish with variants; the host styles the `.prices` flex container. */
export function renderPriceColumns(prices: QmPriceColumn[]) {
  return html`
    <div part="prices" class="prices">
      ${prices.map(
        (price) =>
          html`<qm-price
            part="price"
            .label=${price.label}
            .value=${price.value}
            .oldValue=${price.oldValue}
          ></qm-price>`,
      )}
    </div>
  `;
}

export function defineQmPrice() {
  if (!customElements.get(QM_PRICE_TAG_NAME)) {
    customElements.define(QM_PRICE_TAG_NAME, QmPrice);
  }
}

export type QmPriceArgs = Partial<Pick<QmPrice, "label" | "value" | "oldValue">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-price": QmPrice;
  }
}
