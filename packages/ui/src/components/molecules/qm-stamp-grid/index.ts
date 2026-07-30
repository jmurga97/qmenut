import { html } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";

export const QM_STAMP_GRID_TAG_NAME = "qm-stamp-grid";

const componentStyles = createComponentStyles(componentStylesText);

export class QmStampGrid extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: Number })
  total = 0;

  @property({ type: Number })
  filled = 0;

  @property({ type: Number, attribute: "animated-index" })
  animatedIndex = -1;

  @property({ type: String, attribute: "aria-label" })
  ariaLabel = "";

  render() {
    const total = Math.max(0, Math.floor(this.total));
    const filled = Math.min(total, Math.max(0, Math.floor(this.filled)));

    return html`
      <div class="grid" role="img" aria-label=${this.ariaLabel} style=${`--qm-stamp-count:${Math.max(total, 1)}`}>
        ${Array.from(
          { length: total },
          (_, index) => html`
            <span
              class=${`stamp ${index < filled ? "stamp--filled" : ""} ${index === this.animatedIndex ? "stamp--new" : ""}`}
              aria-hidden="true"
            ></span>
          `,
        )}
      </div>
    `;
  }
}

export function defineQmStampGrid() {
  if (!customElements.get(QM_STAMP_GRID_TAG_NAME)) {
    customElements.define(QM_STAMP_GRID_TAG_NAME, QmStampGrid);
  }
}

export type QmStampGridArgs = Partial<Pick<QmStampGrid, "total" | "filled" | "animatedIndex" | "ariaLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-stamp-grid": QmStampGrid;
  }
}
