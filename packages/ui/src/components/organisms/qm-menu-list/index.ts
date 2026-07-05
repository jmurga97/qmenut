import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmDishRow } from "../../molecules/qm-dish-row";
import { defineQmFeatured } from "../../molecules/qm-featured";
import { defineQmSectionHeader } from "../../molecules/qm-section-header";

export const QM_MENU_LIST_TAG_NAME = "qm-menu-list";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Menu body: a `featured` slot (single `qm-featured`), a `section-header` slot (single
 * `qm-section-header`), and a default slot for repeated `qm-dish-row` children — slot
 * composition rather than an `items[]` prop, per CONTRIBUTING RULE 4. `qm-dish-row` already
 * bakes its own inter-row spacing/divider (`--qm-row-pad`/`--qm-divider`) into its own
 * `:host`, so this organism doesn't add any extra per-row gap; the only spacing it owns is
 * the 16px gap between the three major blocks (featured card / section header / dish list),
 * a literal from the reference mockup with no backing `--qm-*` token yet — flagged as
 * hardcoded geometry pending a future token, same as `qm-promo-list`'s 16px card gap.
 */
export class QmMenuList extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "empty-label" })
  emptyLabel = "";

  @state()
  private hasDishes = false;

  private readonly handleSlotChange = (event: Event) => {
    const assigned = (event.target as HTMLSlotElement).assignedElements({ flatten: true });
    this.hasDishes = assigned.length > 0;
  };

  render() {
    return html`
      <div part="frame" class="frame">
        <slot name="featured"></slot>
        <slot name="section-header"></slot>
        <div part="rows" class="rows">
          <slot @slotchange=${this.handleSlotChange}></slot>
          ${!this.hasDishes && this.emptyLabel ? html`<p part="empty" class="empty">${this.emptyLabel}</p>` : nothing}
        </div>
      </div>
    `;
  }
}

export function defineQmMenuList() {
  defineQmFeatured();
  defineQmSectionHeader();
  defineQmDishRow();

  if (!customElements.get(QM_MENU_LIST_TAG_NAME)) {
    customElements.define(QM_MENU_LIST_TAG_NAME, QmMenuList);
  }
}

export type QmMenuListArgs = Partial<Pick<QmMenuList, "emptyLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-menu-list": QmMenuList;
  }
}
