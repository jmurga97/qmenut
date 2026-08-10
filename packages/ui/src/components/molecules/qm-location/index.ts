import { html, LitElement, nothing } from "lit";
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
export interface QmLocationValue {
  id?: string;
  name: string;
  addr: string;
  status: string;
  actionsLabel?: string;
  phone?: string;
  phoneHref?: string;
  phoneLabel?: string;
  whatsappHref?: string;
  whatsappLabel?: string;
  mapHref?: string;
  mapLabel?: string;
  menuHref?: string;
  menuLabel?: string;
  socialHref?: string;
  socialLabel?: string;
  socialLinks?: { href: string; label: string }[];
}

export class QmLocation extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmLocationValue;

  private renderAction(href: string | undefined, label: string | undefined) {
    if (!href || !label) return html``;

    const external = href.startsWith("http");
    return html`
      <a
        part="action"
        class="action"
        href=${href}
        target=${external ? "_blank" : nothing}
        rel=${external ? "noreferrer" : nothing}
      >
        ${label}
      </a>
    `;
  }

  render() {
    return html`
      <div part="card" class="card">
        <qm-pin part="pin" class="pin" size="18px" aria-hidden="true"></qm-pin>
        <div class="body">
          <div part="name" class="name">${this.value?.name ?? ""}</div>
          <div part="addr" class="addr">${this.value?.addr ?? ""}</div>
          <qm-chip part="status" .text=${this.value?.status ?? ""} variant="default"></qm-chip>
          ${this.value?.phone ? html`<div part="phone" class="phone">${this.value.phone}</div>` : nothing}
          <nav part="actions" class="actions" aria-label=${this.value?.actionsLabel ?? "Contact"}>
            ${this.renderAction(this.value?.phoneHref, this.value?.phoneLabel)}
            ${this.renderAction(this.value?.whatsappHref, this.value?.whatsappLabel)}
            ${this.renderAction(this.value?.mapHref, this.value?.mapLabel)}
            ${this.renderAction(this.value?.menuHref, this.value?.menuLabel)}
            ${this.renderAction(this.value?.socialHref, this.value?.socialLabel)}
            ${(this.value?.socialLinks ?? []).map((link) => this.renderAction(link.href, link.label))}
          </nav>
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

export type QmLocationArgs = Partial<Pick<QmLocation, "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-location": QmLocation;
  }
}
