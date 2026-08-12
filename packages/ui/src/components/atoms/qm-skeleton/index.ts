import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_SKELETON_TAG_NAME = "qm-skeleton";

const componentStyles = createComponentStyles(componentStylesText);

export type QmSkeletonVariant = "text" | "block" | "circle";

/**
 * Single decorative loading shape. Consumers compose multiple instances to build their
 * own content-specific skeletons and control geometry through the `--qm-skeleton-*`
 * custom properties.
 */
export class QmSkeleton extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  variant: QmSkeletonVariant = "text";

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("aria-hidden", "true");
  }

  render() {
    return html`<span part="shape" class="shape" data-variant=${this.variant}></span>`;
  }
}

export function defineQmSkeleton() {
  if (!customElements.get(QM_SKELETON_TAG_NAME)) {
    customElements.define(QM_SKELETON_TAG_NAME, QmSkeleton);
  }
}

export type QmSkeletonArgs = Partial<Pick<QmSkeleton, "variant">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-skeleton": QmSkeleton;
  }
}
