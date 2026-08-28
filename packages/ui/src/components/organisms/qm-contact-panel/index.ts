import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmSectionNum } from "../../atoms/qm-section-num";
import { defineQmLocation } from "../../molecules/qm-location";
import { defineQmMap } from "../../molecules/qm-map";
import { defineQmSocialLinks } from "../../molecules/qm-social-links";

import type { QmMapValue } from "../../molecules/qm-map";
import type { QmSocialLink } from "../../molecules/qm-social-links";
import type { TemplateResult } from "lit";

export const QM_CONTACT_PANEL_TAG_NAME = "qm-contact-panel";

const componentStyles = createComponentStyles(componentStylesText);

/** Public contact body with an optional immersive map, branch cards, social links, and trailing content slot. */
export interface QmContactPanelValue {
  ubicacionNum?: string;
  ubicacionLabel?: string;
  sedesNum?: string;
  sedesLabel?: string;
  map?: QmMapValue;
  socialLinks?: QmSocialLink[];
  socialLinksLabel?: string;
}

export class QmContactPanel extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmContactPanelValue;

  private renderUbicacion(): TemplateResult {
    if (!this.value?.map?.markers.length) return html``;

    return html`
      <section part="ubicacion" class="section map-section">
        <qm-map part="map" class="map" .value=${this.value.map}></qm-map>
        <div class="map-fade" aria-hidden="true"></div>
      </section>
    `;
  }

  private renderSedes(num: string): TemplateResult {
    return html`
      <section part="sedes" class="section">
        <qm-section-num
          part="sedes-header"
          .num=${this.value?.sedesNum ?? num}
          .label=${this.value?.sedesLabel ?? "Sedes"}
        ></qm-section-num>
        <div part="sedes-list" class="sedes-list">
          <slot name="sedes"></slot>
        </div>
      </section>
    `;
  }

  private renderSocialLinks(): TemplateResult {
    if (!this.value?.socialLinks?.length) return html``;

    return html`
      <qm-social-links
        part="social-links"
        .links=${this.value.socialLinks}
        .ariaLabel=${this.value.socialLinksLabel ?? "Social networks"}
      ></qm-social-links>
    `;
  }

  render() {
    const hasMap = Boolean(this.value?.map?.markers.length);
    return html`
      ${this.renderUbicacion()}${this.renderSocialLinks()}${this.renderSedes(hasMap ? "02" : "01")}
      <slot name="reviews"></slot>
    `;
  }
}

export function defineQmContactPanel() {
  defineQmSectionNum();
  defineQmLocation();
  defineQmMap();
  defineQmSocialLinks();

  if (!customElements.get(QM_CONTACT_PANEL_TAG_NAME)) {
    customElements.define(QM_CONTACT_PANEL_TAG_NAME, QmContactPanel);
  }
}

export type QmContactPanelArgs = Partial<Pick<QmContactPanel, "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-contact-panel": QmContactPanel;
  }
}
