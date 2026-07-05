import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmHeading } from "../../atoms/qm-heading";

export const QM_SECTION_HEADER_TAG_NAME = "qm-section-header";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Menu-section header: a large number, an eyebrow+title block, and an item count, with a
 * bottom rule — e.g. "01 · Cocina de mercado · Degustación · 7 pases". Conceptually
 * overlaps with the `qm-section-num` atom (num + label + count), but that atom's label is a
 * single line and can't fit the eyebrow-over-title block this molecule needs, so this is a
 * fresh composition rather than a wrapper around it. Reuses `qm-heading`'s own
 * eyebrow+title rendering for the tagline/label pair instead of duplicating that CSS —
 * accepts `qm-heading`'s own title size as-is since it has no size override hook.
 */
export class QmSectionHeader extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  num = "";

  @property({ type: String })
  tagline?: string;

  @property({ type: String, attribute: "section-label" })
  sectionLabel = "";

  @property({ type: String, attribute: "section-count" })
  sectionCount?: string;

  render() {
    return html`
      <div part="row" class="row">
        <div class="left">
          <span part="num" class="num">${this.num}</span>
          <qm-heading part="heading" .eyebrow=${this.tagline} .text=${this.sectionLabel} .divider=${false}></qm-heading>
        </div>
        ${this.sectionCount ? html`<span part="count" class="count">${this.sectionCount}</span>` : nothing}
      </div>
    `;
  }
}

export function defineQmSectionHeader() {
  defineQmHeading();

  if (!customElements.get(QM_SECTION_HEADER_TAG_NAME)) {
    customElements.define(QM_SECTION_HEADER_TAG_NAME, QmSectionHeader);
  }
}

export type QmSectionHeaderArgs = Partial<Pick<QmSectionHeader, "num" | "tagline" | "sectionLabel" | "sectionCount">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-section-header": QmSectionHeader;
  }
}
