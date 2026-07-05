import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmPromo } from "../../molecules/qm-promo";

export const QM_PROMO_LIST_TAG_NAME = "qm-promo-list";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Promos body: a default slot for repeated `qm-promo` children — slot composition rather
 * than an `items[]` prop, per CONTRIBUTING RULE 4. `qm-promo` renders as a full bordered
 * card (not a bare row with self-managed spacing like `qm-dish-row`), so this organism owns
 * the 16px gap between cards itself. That 16px is a literal from the reference mockup with
 * no backing `--qm-*` token yet (`tokens.ts` has no `--qm-promo-gap`) — flagged as hardcoded
 * geometry pending a future token addition; out of scope for this organism-only pass.
 */
export class QmPromoList extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "empty-label" })
  emptyLabel = "";

  @state()
  private hasPromos = false;

  private readonly handleSlotChange = (event: Event) => {
    const assigned = (event.target as HTMLSlotElement).assignedElements({ flatten: true });
    this.hasPromos = assigned.length > 0;
  };

  render() {
    return html`
      <div part="list" class="list">
        <slot @slotchange=${this.handleSlotChange}></slot>
        ${!this.hasPromos && this.emptyLabel ? html`<p part="empty" class="empty">${this.emptyLabel}</p>` : nothing}
      </div>
    `;
  }
}

export function defineQmPromoList() {
  defineQmPromo();

  if (!customElements.get(QM_PROMO_LIST_TAG_NAME)) {
    customElements.define(QM_PROMO_LIST_TAG_NAME, QmPromoList);
  }
}

export type QmPromoListArgs = Partial<Pick<QmPromoList, "emptyLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-promo-list": QmPromoList;
  }
}
