import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QM_TAB_TAG_NAME, defineQmTab } from "../../atoms/qm-tab";

import type { QmTab } from "../../atoms/qm-tab";

export const QM_NAV_BAR_TAG_NAME = "qm-nav-bar";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Bottom tab bar: a `role="tablist"` container that manages arrow-key/Home/End roving
 * focus across slotted `qm-tab` children, per `qm-tab`'s own doc comment anticipating
 * exactly this organism. Implements "selection follows focus" (one of the two WAI-ARIA
 * Tabs activation models): an arrow key press moves DOM focus AND calls the target tab's
 * public `select()` method, so its existing `qm-select` event flow drives the consumer's
 * controlled `active` state. `select()` — not `.click()` — because `.click()` on a
 * custom-element host only dispatches a synthetic event at the host itself; it never reaches
 * the click listener bound to the native `<button>` inside `qm-tab`'s shadow DOM. This
 * organism never tracks a selected index itself — `active` stays single-sourced on the
 * consumer, per RULE 4.
 *
 * Bar chrome (background/border/radius/shadow/backdrop/margin) is entirely
 * `--qm-nav-*`-token-driven — there's no `navStyle` prop here, since `apply-theme.ts`
 * already resolves `bar`/`floating`/`solid` globally; a second selector on this organism
 * would just be a second source of truth for the same choice.
 *
 * Does not implement `FocusableMixin`: this organism hosts an arbitrary number of
 * independently-focusable `qm-tab` children (each already `delegatesFocus`), not a single
 * delegatable control, so there is no one `focusableElement` to point at.
 */
export class QmNavBar extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "aria-label" })
  ariaLabel: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this.handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.handleKeydown);
  }

  private getTabs(): QmTab[] {
    const slot = this.renderRoot.querySelector("slot");
    const assigned = slot?.assignedElements({ flatten: true }) ?? [];
    return assigned.filter((el): el is QmTab => el.tagName.toLowerCase() === QM_TAB_TAG_NAME);
  }

  private readonly handleKeydown = (event: KeyboardEvent) => {
    const tabs = this.getTabs();
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((tab) => tab.active);
    const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;

    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (fallbackIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (fallbackIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    nextTab.focus();
    nextTab.select();
  };

  render() {
    return html`
      <div part="bar" class="bar" role="tablist" aria-label=${this.ariaLabel ?? nothing}>
        <slot></slot>
      </div>
    `;
  }
}

export function defineQmNavBar() {
  defineQmTab();

  if (!customElements.get(QM_NAV_BAR_TAG_NAME)) {
    customElements.define(QM_NAV_BAR_TAG_NAME, QmNavBar);
  }
}

export type QmNavBarArgs = Partial<Pick<QmNavBar, "ariaLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-nav-bar": QmNavBar;
  }
}
