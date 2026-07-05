import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmChip } from "../../atoms/qm-chip";
import { defineQmPin } from "../../atoms/qm-pin";

export const QM_LOCATION_TAG_NAME = "qm-location";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Restaurant location card: pin, name, address, and a status pill (e.g. "Abierto"). Reuses
 * `qm-pin` (its default `--qm-emph` background already matches the design) and `qm-chip`'s
 * `variant="default"` (its outline border already matches the design's status pill exactly),
 * so this molecule needs no bespoke pin/chip styling of its own. The design's raw markup
 * references a `--qm-line` token for the chip border that doesn't exist in the theme
 * contract — moot here since `qm-chip` already supplies that border itself via `--qm-ink`.
 */
export class QmLocation extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  name = "";

  @property({ type: String })
  addr = "";

  @property({ type: String })
  status = "";

  render() {
    return html`
      <div part="card" class="card">
        <qm-pin part="pin" class="pin" size="18px" aria-hidden="true"></qm-pin>
        <div class="body">
          <div part="name" class="name">${this.name}</div>
          <div part="addr" class="addr">${this.addr}</div>
          <qm-chip part="status" .text=${this.status} variant="default"></qm-chip>
        </div>
      </div>
    `;
  }
}

export function defineQmLocation() {
  defineQmPin();
  defineQmChip();

  if (!customElements.get(QM_LOCATION_TAG_NAME)) {
    customElements.define(QM_LOCATION_TAG_NAME, QmLocation);
  }
}

export type QmLocationArgs = Partial<Pick<QmLocation, "name" | "addr" | "status">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-location": QmLocation;
  }
}
