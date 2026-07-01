import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_HEADING_TAG_NAME = "qm-heading";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Screen/section header: optional eyebrow line, title, optional bottom rule — matches the
 * "typographic header" block (restaurant name + tagline) from the design reference.
 */
export class QmHeading extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  text = "";

  @property({ type: String })
  eyebrow?: string;

  @property({ type: Boolean })
  divider = true;

  render() {
    return html`
      ${this.eyebrow ? html`<span part="eyebrow" class="eyebrow">${this.eyebrow}</span>` : nothing}
      <span part="title" class="title">${this.text}</span>
      ${this.divider ? html`<hr part="rule" class="rule" />` : nothing}
    `;
  }
}

export function defineQmHeading() {
  if (!customElements.get(QM_HEADING_TAG_NAME)) {
    customElements.define(QM_HEADING_TAG_NAME, QmHeading);
  }
}

export type QmHeadingArgs = Partial<Pick<QmHeading, "text" | "eyebrow" | "divider">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-heading": QmHeading;
  }
}
