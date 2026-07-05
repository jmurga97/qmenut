import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_DISH_EXTRAS_TAG_NAME = "qm-dish-extras";

const componentStyles = createComponentStyles(componentStylesText);

export type QmDishExtraItem = {
  name: string;
  price: string;
};

/** Display-only dish extras list for modal details. */
export class QmDishExtras extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  label = "Extras";

  @property({ attribute: false })
  items: QmDishExtraItem[] = [];

  render() {
    return html`
      <h3 part="label" class="label">${this.label}</h3>
      <ul part="list" class="list">
        ${this.items.map(
          (item) => html`
            <li part="item" class="item">
              <span part="name" class="name">${item.name}</span>
              <strong part="price" class="price">${item.price}</strong>
            </li>
          `,
        )}
      </ul>
    `;
  }
}

export function defineQmDishExtras() {
  if (!customElements.get(QM_DISH_EXTRAS_TAG_NAME)) {
    customElements.define(QM_DISH_EXTRAS_TAG_NAME, QmDishExtras);
  }
}

export type QmDishExtrasArgs = Partial<Pick<QmDishExtras, "items" | "label">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-dish-extras": QmDishExtras;
  }
}
