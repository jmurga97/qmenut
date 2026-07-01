import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../internal/base-styles";
import { createComponentStyles } from "../../internal/component-styles";

export const QM_WORDMARK_TAG_NAME = "qm-wordmark";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Brand/restaurant name set in the archetype's heading type. Size is a local custom
 * property (`--qm-wordmark-size`, default `1.5rem`) so callers can resize it per context
 * (nav bar vs. hero) without a `size` prop.
 */
export class QmWordmark extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  text = "";

  render() {
    return html`<span part="text" class="text">${this.text}</span>`;
  }
}

export function defineQmWordmark() {
  if (!customElements.get(QM_WORDMARK_TAG_NAME)) {
    customElements.define(QM_WORDMARK_TAG_NAME, QmWordmark);
  }
}

export type QmWordmarkArgs = Partial<Pick<QmWordmark, "text">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-wordmark": QmWordmark;
  }
}
