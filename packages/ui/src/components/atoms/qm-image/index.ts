import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_IMAGE_TAG_NAME = "qm-image";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Image placeholder that also accepts a real slotted `<img>`. The `--qm-ph` hatch pattern
 * always renders behind the slot. The caption is native slot fallback content, so SSR and
 * the browser both suppress it immediately when a real image is assigned.
 */
export class QmImage extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  label = "";

  render() {
    return html`
      <div part="frame" class="frame">
        <slot>${this.label ? html`<span part="label" class="label">${this.label}</span>` : nothing}</slot>
      </div>
    `;
  }
}

export function defineQmImage() {
  if (!customElements.get(QM_IMAGE_TAG_NAME)) {
    customElements.define(QM_IMAGE_TAG_NAME, QmImage);
  }
}

export type QmImageArgs = Partial<Pick<QmImage, "label">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-image": QmImage;
  }
}
