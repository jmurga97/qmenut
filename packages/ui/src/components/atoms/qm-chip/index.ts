import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_CHIP_TAG_NAME = "qm-chip";

const componentStyles = createComponentStyles(componentStylesText);

export type QmChipVariant = "default" | "muted";

/** Small outlined status pill (e.g. "Abierto", a closing time "23:30"). Read-only label. */
export class QmChip extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  text = "";

  @property({ type: String })
  variant: QmChipVariant = "default";

  render() {
    return html`<span part="text" class="text" data-variant=${this.variant}>${this.text}</span>`;
  }
}

export function defineQmChip() {
  if (!customElements.get(QM_CHIP_TAG_NAME)) {
    customElements.define(QM_CHIP_TAG_NAME, QmChip);
  }
}

export type QmChipArgs = Partial<Pick<QmChip, "text" | "variant">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-chip": QmChip;
  }
}
