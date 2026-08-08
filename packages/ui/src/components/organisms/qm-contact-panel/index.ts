import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmImage } from "../../atoms/qm-image";
import { defineQmPin } from "../../atoms/qm-pin";
import { defineQmSectionNum } from "../../atoms/qm-section-num";
import { defineQmFieldGroup } from "../../molecules/qm-field-group";
import { defineQmLocation } from "../../molecules/qm-location";

import type { TemplateResult } from "lit";

export const QM_CONTACT_PANEL_TAG_NAME = "qm-contact-panel";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Contacto body: three stacked subsections — Ubicación (map placeholder + centered pin),
 * Sedes (a `sedes` slot for repeated `qm-location` cards), and Mensaje (a wrapped
 * `qm-field-group`, its own props forwarded 1:1 so this organism holds no shadow copy of
 * controlled state, per RULE 4).
 *
 * Each subsection header reuses `qm-section-num`, which bakes its own `border-top` into its
 * `:host` — so all three subsections render a rule above them, including the first, where
 * the reference mockup omits it. That border can't be suppressed from here without reaching
 * into `qm-section-num`'s shadow DOM (forbidden by RULE 12); the proper remedy is a
 * suppression prop on `qm-section-num` itself, which is out of scope for this organism-only
 * change — so this is an accepted, documented visual deviation rather than a hack.
 *
 * `qm-location` already renders as a full bordered card (like `qm-promo`), not a bare row —
 * so the `sedes` list uses card-stack spacing (flex `gap`), the same mechanism as
 * `qm-promo-list`, rather than the mockup's flat hairline-divided list.
 */
export interface QmContactPanelValue {
  ubicacionNum?: string;
  ubicacionLabel?: string;
  sedesNum?: string;
  sedesLabel?: string;
  mensajeNum?: string;
  mensajeLabel?: string;
  mapLabel?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  messageLabel?: string;
  messagePlaceholder?: string;
}

export class QmContactPanel extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmContactPanelValue;

  @property({ type: String, attribute: "name-value" })
  nameValue = "";

  @property({ type: String, attribute: "message-value" })
  messageValue = "";

  @property({ type: String, attribute: "submit-label" })
  submitLabel = "Enviar";

  @property({ type: Boolean, reflect: true })
  disabled = false;

  private renderUbicacion(): TemplateResult {
    return html`
      <section part="ubicacion" class="section">
        <qm-section-num
          part="ubicacion-header"
          .num=${this.value?.ubicacionNum ?? "01"}
          .label=${this.value?.ubicacionLabel ?? "Ubicación"}
        >
        </qm-section-num>
        <div part="map" class="map">
          <qm-image part="map-image" class="map-image" label=${this.value?.mapLabel ?? ""}></qm-image>
          <qm-pin part="map-pin" class="map-pin" size="32px"></qm-pin>
        </div>
      </section>
    `;
  }

  private renderSedes(): TemplateResult {
    return html`
      <section part="sedes" class="section">
        <qm-section-num
          part="sedes-header"
          .num=${this.value?.sedesNum ?? "02"}
          .label=${this.value?.sedesLabel ?? "Sedes"}
        ></qm-section-num>
        <div part="sedes-list" class="sedes-list">
          <slot name="sedes"></slot>
        </div>
      </section>
    `;
  }

  private renderMensaje(): TemplateResult {
    return html`
      <section part="mensaje" class="section">
        <qm-section-num
          part="mensaje-header"
          .num=${this.value?.mensajeNum ?? "03"}
          .label=${this.value?.mensajeLabel ?? "Mensaje"}
        ></qm-section-num>
        <qm-field-group
          part="form"
          .nameLabel=${this.value?.nameLabel ?? "Nombre"}
          .nameValue=${this.nameValue}
          .namePlaceholder=${this.value?.namePlaceholder ?? ""}
          .messageLabel=${this.value?.messageLabel ?? "Mensaje"}
          .messageValue=${this.messageValue}
          .messagePlaceholder=${this.value?.messagePlaceholder ?? ""}
          .submitLabel=${this.submitLabel}
          ?disabled=${this.disabled}
        ></qm-field-group>
      </section>
    `;
  }

  render() {
    return html`${this.renderUbicacion()}${this.renderSedes()}${this.renderMensaje()}`;
  }
}

export function defineQmContactPanel() {
  defineQmSectionNum();
  defineQmImage();
  defineQmPin();
  defineQmLocation();
  defineQmFieldGroup();

  if (!customElements.get(QM_CONTACT_PANEL_TAG_NAME)) {
    customElements.define(QM_CONTACT_PANEL_TAG_NAME, QmContactPanel);
  }
}

export type QmContactPanelArgs = Partial<
  Pick<QmContactPanel, "value" | "nameValue" | "messageValue" | "submitLabel" | "disabled">
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-contact-panel": QmContactPanel;
  }
}
