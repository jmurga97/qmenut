import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_SECTION_NUM_TAG_NAME = "qm-section-num";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Section header row: "01 · Degustación · 7 pases". The number hides itself via
 * `display: var(--qm-num, inline)` — archetypes like `fast`/`cafe`/`tapas` set that to
 * `none`.
 */
export class QmSectionNum extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  num = "";

  @property({ type: String })
  label = "";

  @property({ type: String })
  count?: string;

  render() {
    return html`
      <span class="left">
        <span part="num" class="num">${this.num}</span>
        <span part="label" class="label">${this.label}</span>
      </span>
      ${this.count ? html`<span part="count" class="count">${this.count}</span>` : nothing}
    `;
  }
}

export function defineQmSectionNum() {
  if (!customElements.get(QM_SECTION_NUM_TAG_NAME)) {
    customElements.define(QM_SECTION_NUM_TAG_NAME, QmSectionNum);
  }
}

export type QmSectionNumArgs = Partial<Pick<QmSectionNum, "num" | "label" | "count">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-section-num": QmSectionNum;
  }
}
