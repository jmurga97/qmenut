import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmPrice } from "../../atoms/qm-price";

export const QM_DISH_ROW_TAG_NAME = "qm-dish-row";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * A single menu-dish row: optional photo, name, optional dietary/spice tag, description,
 * and price — e.g. "Ceviche de corvina · Leche de tigre, camote, cancha · $12.500". Meant to
 * be repeated inside a list; the surrounding card/list container belongs to the (organism)
 * menu section, out of scope here. The tag pill uses the `--qm-tag-*` token group, which is
 * distinct from `qm-badge`'s `--qm-badge-*` contract, so it's bespoke markup rather than a
 * wrapped atom. `featured` swaps in the `--qm-tag-featured-*` group instead of `--qm-tag-*`
 * so it reads as a stronger emphasis even where a template themes both tag groups the same.
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
            ${this.value?.tag ? html`<span part="tag" class=${tagClass}>${this.value.tag}</span>` : nothing}
          </div>
          <div part="desc" class="desc">${this.value?.desc ?? ""}</div>
        </div>
        <qm-price part="price" .value=${this.value?.price ?? ""} .oldValue=${this.value?.oldPrice}></qm-price>
      </div>
    `;
  }
}

export function defineQmDishRow() {
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
