import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_BADGE_TAG_NAME = "qm-badge";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Discount/combo badge (e.g. "−30%", "2×1"). Consumes the theme engine's `--qm-badge-*`
 * token group directly — those are already expanded per-template `badgeShape` in
 * `theme/apply-theme.ts`, so this atom never hardcodes a color split itself.
 */
export class QmBadge extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  text = "";

  render() {
    return html`<span part="text" class="text">${this.text}</span>`;
  }
}

export function defineQmBadge() {
  if (!customElements.get(QM_BADGE_TAG_NAME)) {
    customElements.define(QM_BADGE_TAG_NAME, QmBadge);
  }
}

export type QmBadgeArgs = Partial<Pick<QmBadge, "text">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-badge": QmBadge;
  }
}
