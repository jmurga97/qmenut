import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmPrice } from "../../atoms/qm-price";

export const QM_PROMO_TAG_NAME = "qm-promo";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Promo/combo card: a solid discount block, name, description, validity window, and price —
 * e.g. "−30% · Combo pareja · Válido L-J". The discount block is a solid `--qm-primary`
 * rectangle, a different visual contract than `qm-badge`'s outline/pill styles, so it's
 * bespoke markup rather than a wrapped atom. Reuses `qm-price` for price; see `qm-featured`
 * for the accepted font-size trade-off from that atom having no size override.
 */
export class QmPromo extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  discount = "";

  @property({ type: String })
  name = "";

  @property({ type: String })
  desc = "";

  @property({ type: String })
  price = "";

  @property({ type: String, attribute: "old-price" })
  oldPrice?: string;

  @property({ type: String })
  vigencia = "";

  render() {
    return html`
      <div part="card" class="card">
        <div class="inner">
          <div part="discount" class="discount">
            <span class="discount-value">${this.discount}</span>
          </div>
          <div class="body">
            <div part="name" class="name">${this.name}</div>
            <div part="desc" class="desc">${this.desc}</div>
            <div class="footer">
              <span part="vigencia" class="vigencia">${this.vigencia}</span>
              <qm-price part="price" .value=${this.price} .oldValue=${this.oldPrice}></qm-price>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export function defineQmPromo() {
  defineQmPrice();

  if (!customElements.get(QM_PROMO_TAG_NAME)) {
    customElements.define(QM_PROMO_TAG_NAME, QmPromo);
  }
}

export type QmPromoArgs = Partial<Pick<QmPromo, "discount" | "name" | "desc" | "price" | "oldPrice" | "vigencia">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-promo": QmPromo;
  }
}
