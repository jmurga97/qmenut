import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_DIVIDER_TAG_NAME = "qm-divider";

const componentStyles = createComponentStyles(componentStylesText);

export type QmDividerVariant = "rule" | "hairline";

/**
 * Horizontal separator. `hairline` (default) is the general-purpose 1px divider for rows
 * and lists; `rule` is the heavier section-boundary weight already used inside
 * `qm-heading`'s internal rule. Renders a native `<hr>`, which is already semantically a
 * separator — no extra ARIA needed.
 */
export class QmDivider extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  variant: QmDividerVariant = "hairline";

  render() {
    return html`<hr part="rule" class="rule" data-variant=${this.variant} />`;
  }
}

export function defineQmDivider() {
  if (!customElements.get(QM_DIVIDER_TAG_NAME)) {
    customElements.define(QM_DIVIDER_TAG_NAME, QmDivider);
  }
}

export type QmDividerArgs = Partial<Pick<QmDivider, "variant">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-divider": QmDivider;
  }
}
