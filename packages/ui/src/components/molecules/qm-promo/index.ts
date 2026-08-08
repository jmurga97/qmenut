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
export interface QmPromoValue {
  discount: string;
  name: string;
  desc: string;
  price?: string;
  oldPrice?: string;
  vigencia: string;
}

export class QmPromo extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmPromoValue;

  render() {
    return html`
      <div part="card" class="card">
        <div class="inner">
          <div part="discount" class="discount">
            <span class="discount-value">${this.value?.discount ?? ""}</span>
          </div>
          <div class="body">
            <div part="name" class="name">${this.value?.name ?? ""}</div>
            <div part="desc" class="desc">${this.value?.desc ?? ""}</div>
            <div class="footer">
              <span part="vigencia" class="vigencia">${this.value?.vigencia ?? ""}</span>
              <qm-price part="price" .value=${this.value?.price ?? ""} .oldValue=${this.value?.oldPrice}></qm-price>
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

export type QmPromoArgs = Partial<Pick<QmPromo, "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-promo": QmPromo;
  }
}
