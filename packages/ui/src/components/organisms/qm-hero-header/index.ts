import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmImage } from "../../atoms/qm-image";
import { defineQmLang } from "../../atoms/qm-lang";
import { defineQmWordmark } from "../../atoms/qm-wordmark";

import type { QmLangOption } from "../../atoms/qm-lang";

export const QM_HERO_HEADER_TAG_NAME = "qm-hero-header";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Photo-led menu header (`photoMode: hero`/`heroxl`): full-bleed photo, gradient scrim, a
 * top-left label, a language dropdown, and a bottom cluster (logo + name + tagline) in
 * white text. Reuses `qm-image` for both the background photo and the logo badge (its
 * existing hatch-placeholder/real-`<img>` contract already fits), and `qm-wordmark` for the
 * name. The scrim and label positioning are bespoke markup — no existing atom/token owns
 * "positioned text over a photo," the same reasoning `qm-featured` already uses for its tag
 * block. White-on-photo coloring for `qm-lang`/`qm-wordmark` is done by locally overriding
 * `--qm-emph-ink`/`--qm-ink` on their wrapper — a token override, not shadow-DOM reach-in.
 */
export class QmHeroHeader extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "hero-label" })
  heroLabel = "";

  @property({ type: String })
  name = "";

  @property({ type: String })
  tagline = "";

  @property({ type: String, attribute: "lang-value" })
  langValue = "";

  @property({ attribute: false })
  langOptions: QmLangOption[] = [];

  @property({ type: String, attribute: "lang-label" })
  langLabel = "";

  @property({ type: String, attribute: "logo-label" })
  logoLabel = "LOGO";

  @property({ type: Boolean, reflect: true })
  compact = false;

  render() {
    return html`
      <div part="frame" class="frame">
        <qm-image part="photo" class="photo" label="foto · local" aria-hidden="true"
          ><slot name="photo"></slot
        ></qm-image>
        <div part="scrim" class="scrim"></div>
        ${this.heroLabel ? html`<span part="hero-label" class="hero-label">${this.heroLabel}</span>` : ""}
        <div part="lang-wrap" class="lang-wrap">
          <qm-lang part="lang" .value=${this.langValue} .options=${this.langOptions} .label=${this.langLabel}></qm-lang>
        </div>
        <div part="footer" class="footer">
          <qm-image part="logo" class="logo" label=${this.logoLabel}><slot name="logo"></slot></qm-image>
          <div class="text">
            <qm-wordmark part="name" class="name" .text=${this.name}></qm-wordmark>
            <span part="tagline" class="tagline">${this.tagline}</span>
          </div>
        </div>
      </div>
    `;
  }
}

export function defineQmHeroHeader() {
  defineQmImage();
  defineQmLang();
  defineQmWordmark();

  if (!customElements.get(QM_HERO_HEADER_TAG_NAME)) {
    customElements.define(QM_HERO_HEADER_TAG_NAME, QmHeroHeader);
  }
}

export type QmHeroHeaderArgs = Partial<
  Pick<
    QmHeroHeader,
    "heroLabel" | "name" | "tagline" | "langValue" | "langOptions" | "langLabel" | "logoLabel" | "compact"
  >
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-hero-header": QmHeroHeader;
  }
}
