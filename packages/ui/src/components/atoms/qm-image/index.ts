import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

export const QM_IMAGE_TAG_NAME = "qm-image";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Image placeholder that also accepts a real slotted `<img>`. The `--qm-ph` hatch pattern
 * always renders behind the slot; once a consumer slots real content in, the fallback
 * caption is suppressed via a `slotchange` check (internal-only derived state, not a
 * public prop, so it doesn't compete with any controlled API).
 */
export class QmImage extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  label = "";

  @state()
  private hasContent = false;

  private readonly handleSlotChange = (event: Event) => {
    const assigned = (event.target as HTMLSlotElement).assignedNodes({ flatten: true });
    this.hasContent = assigned.some((node) => node.nodeType === Node.ELEMENT_NODE);
  };

  render() {
    return html`
      <div part="frame" class="frame" data-has-content=${this.hasContent}>
        <slot @slotchange=${this.handleSlotChange}></slot>
        ${!this.hasContent && this.label ? html`<span part="label" class="label">${this.label}</span>` : nothing}
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
