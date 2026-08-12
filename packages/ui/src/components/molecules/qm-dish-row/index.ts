import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmBadge } from "../../atoms/qm-badge";
import { defineQmPrice } from "../../atoms/qm-price";

export const QM_DISH_ROW_TAG_NAME = "qm-dish-row";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * A single menu-dish row: optional photo, name, optional dietary/spice tag, description,
 * and price — e.g. "Ceviche de corvina · Leche de tigre, camote, cancha · $12.500". Meant to
 * be repeated inside a list; the surrounding card/list container belongs to the (organism)
 * menu section, out of scope here. Composes `qm-badge` for its optional tag so promotion
 * emphasis follows each template's badge shape. `featured` overrides the badge variables
 * with the stronger featured-tag token group.
 */
export interface QmDishRowValue {
  name: string;
  desc: string;
  price: string;
  oldPrice?: string;
  tag?: string;
  featured?: boolean;
  photo: boolean;
  photoUrl?: string;
}

export class QmDishRow extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmDishRowValue;

  render() {
    const photoImage = this.value?.photoUrl
      ? html`<img src=${this.value.photoUrl} alt="" loading="lazy" decoding="async" />`
      : nothing;
    const tagClass = this.value?.featured ? "tag tag--featured" : "tag";

    return html`
      <div part="row" class="row">
        ${this.value?.photo ? html` <span part="photo" class="photo">${photoImage}</span> ` : nothing}
        <div class="body">
          <div class="name-line">
            <span part="name" class="name">${this.value?.name ?? ""}</span>
            ${
              this.value?.tag
                ? html`<qm-badge part="tag" class=${tagClass} .text=${this.value.tag}></qm-badge>`
                : nothing
            }
          </div>
          <div part="desc" class="desc">${this.value?.desc ?? ""}</div>
        </div>
        <qm-price part="price" .value=${this.value?.price ?? ""} .oldValue=${this.value?.oldPrice}></qm-price>
      </div>
    `;
  }
}

export function defineQmDishRow() {
  defineQmBadge();
  defineQmPrice();

  if (!customElements.get(QM_DISH_ROW_TAG_NAME)) {
    customElements.define(QM_DISH_ROW_TAG_NAME, QmDishRow);
  }
}

export type QmDishRowArgs = Partial<Pick<QmDishRow, "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-dish-row": QmDishRow;
  }
}
