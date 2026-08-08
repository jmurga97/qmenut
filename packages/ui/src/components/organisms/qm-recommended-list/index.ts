import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmDishRow } from "../../molecules/qm-dish-row";

export const QM_RECOMMENDED_LIST_TAG_NAME = "qm-recommended-list";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Recommended-dishes body: a default slot for repeated `qm-dish-row` children — slot
 * composition rather than an `items[]` prop, per CONTRIBUTING RULE 4. `qm-dish-row` already
 * bakes its own inter-row spacing/divider into its own `:host` (same as `qm-menu-list`'s row
 * list), so this organism doesn't add a per-row gap, unlike `qm-promo-list`'s 16px card gap.
 */
export interface QmRecommendedListValue {
  emptyLabel?: string;
}

export class QmRecommendedList extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmRecommendedListValue;

  @state()
  private hasDishes = false;

  private readonly handleSlotChange = (event: Event) => {
    const assigned = (event.target as HTMLSlotElement).assignedElements({ flatten: true });
    this.hasDishes = assigned.length > 0;
  };

  render() {
    return html`
      <div part="rows" class="rows">
        <slot @slotchange=${this.handleSlotChange}></slot>
        ${
          !this.hasDishes && this.value?.emptyLabel
            ? html`<p part="empty" class="empty">${this.value.emptyLabel}</p>`
            : nothing
        }
      </div>
    `;
  }
}

export function defineQmRecommendedList() {
  defineQmDishRow();

  if (!customElements.get(QM_RECOMMENDED_LIST_TAG_NAME)) {
    customElements.define(QM_RECOMMENDED_LIST_TAG_NAME, QmRecommendedList);
  }
}

export type QmRecommendedListArgs = Partial<Pick<QmRecommendedList, "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-recommended-list": QmRecommendedList;
  }
}
