import { html } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";

export const QM_TAB_TAG_NAME = "qm-tab";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Single tab button, styled off the generic `--qm-nav-active-*`/`--qm-nav-muted` state
 * tokens (there is no per-index token scheme in this engine — every tab toggles between
 * the same two token groups based on its own `active` prop). `active` is controlled: this
 * atom never sets it itself, it only signals intent via `qm-select` — a tab-bar molecule
 * composing multiple `<qm-tab>`s owns `role="tablist"` and arrow-key/Home/End roving
 * tabindex; this atom only implements the single-tab half of the WAI-ARIA Tabs pattern.
 */
export class QmTab extends QmElement {
  static shadowRootOptions: ShadowRootInit = {
    ...QmElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: Boolean, reflect: true })
  active = false;

  @property({ type: String })
  value = "";

  /** Fires `qm-select` for this tab. Public so a tab-bar can drive selection programmatically
   * (e.g. arrow-key navigation) — `.click()` on the host wouldn't reach this shadow-DOM
   * button's own click listener. */
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
        role="tab"
        aria-selected=${this.active}
        tabindex=${this.active ? 0 : -1}
        data-active=${this.active}
        @click=${this.handleClick}
      >
        <span class="icon" part="icon"><slot name="icon" aria-hidden="true"></slot></span>
        <span class="label" part="label"><slot></slot></span>
      </button>
    `;
  }
}

export function defineQmTab() {
  if (!customElements.get(QM_TAB_TAG_NAME)) {
    customElements.define(QM_TAB_TAG_NAME, QmTab);
  }
}

export type QmTabArgs = Partial<Pick<QmTab, "active" | "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-tab": QmTab;
  }
}
