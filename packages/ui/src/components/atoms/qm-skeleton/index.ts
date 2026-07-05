import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_SKELETON_TAG_NAME = "qm-skeleton";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Loading placeholder: one wider "heading" bar plus `lines` narrower "body" bars. Always
 * decorative — self-applies `aria-hidden` since the whole component is loading UI, never
 * real content.
 */
export class QmSkeleton extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: Number })
  lines = 2;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("aria-hidden", "true");
  }

  render() {
    const bars = Array.from({ length: this.lines }, (_, index) => index);
    return html`
      <span part="heading-bar" class="bar bar--heading"></span>
      ${bars.map(
        (index) => html`<span part="body-bar" class="bar bar--body" data-last=${index === bars.length - 1}></span>`,
      )}
    `;
  }
}

export function defineQmSkeleton() {
  if (!customElements.get(QM_SKELETON_TAG_NAME)) {
    customElements.define(QM_SKELETON_TAG_NAME, QmSkeleton);
  }
}

export type QmSkeletonArgs = Partial<Pick<QmSkeleton, "lines">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-skeleton": QmSkeleton;
  }
}
