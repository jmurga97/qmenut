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
 * wrapped atom.
 */
export class QmDishRow extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  name = "";

  @property({ type: String })
  desc = "";

  @property({ type: String })
  price = "";

  @property({ type: String, attribute: "old-price" })
  oldPrice?: string;

  @property({ type: String })
  tag?: string;

  @property({ type: Boolean })
  photo = false;

  @property({ type: String, attribute: "photo-url" })
  photoUrl?: string;

  render() {
    return html`
      <div part="row" class="row">
        ${this.photo
          ? html`<span part="photo" class="photo"
              >${this.photoUrl ? html`<img src=${this.photoUrl} alt="" />` : nothing}</span
            >`
          : nothing}
        <div class="body">
          <div class="name-line">
            <span part="name" class="name">${this.name}</span>
            ${this.tag ? html`<span part="tag" class="tag">${this.tag}</span>` : nothing}
          </div>
          <div part="desc" class="desc">${this.desc}</div>
        </div>
        <qm-price part="price" .value=${this.price} .oldValue=${this.oldPrice}></qm-price>
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

export type QmDishRowArgs = Partial<
  Pick<QmDishRow, "name" | "desc" | "price" | "oldPrice" | "tag" | "photo" | "photoUrl">
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-dish-row": QmDishRow;
  }
}
