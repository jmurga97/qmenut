import { html } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";

export const QM_CATEGORY_CHIP_TAG_NAME = "qm-category-chip";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Scroll-to-section chip styled by the `--qm-category-*` token group. `active` is
 * controlled: consumers own the visible section and this atom only signals intent through
 * `qm-select`. This is separate from `qm-tab` because it uses `aria-pressed` button semantics
 * rather than participating in a tablist and controlling a tab panel.
 */
export class QmCategoryChip extends QmElement {
  static shadowRootOptions: ShadowRootInit = {
    ...QmElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: Boolean, reflect: true })
  active = false;

  @property({ type: String })
  value = "";

  /** Fires `qm-select` for this chip so composed containers can activate it programmatically. */
  select(): void {
    this.postEvent({ name: "qm-select", detail: { value: this.value } });
  }

  private readonly handleClick = () => {
    this.select();
  };

  render() {
    return html`
      <button
        part="button"
        type="button"
        aria-pressed=${this.active}
        tabindex=${this.active ? 0 : -1}
        data-active=${this.active}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}

export function defineQmCategoryChip() {
  if (!customElements.get(QM_CATEGORY_CHIP_TAG_NAME)) {
    customElements.define(QM_CATEGORY_CHIP_TAG_NAME, QmCategoryChip);
  }
}

export type QmCategoryChipArgs = Partial<Pick<QmCategoryChip, "active" | "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-category-chip": QmCategoryChip;
  }
}
