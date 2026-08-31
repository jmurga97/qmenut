import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmDivider } from "../../atoms/qm-divider";
import { defineQmLang } from "../../atoms/qm-lang";
import { defineQmWordmark } from "../../atoms/qm-wordmark";

import type { QmLangOption } from "../../atoms/qm-lang";
import type { TemplateResult } from "lit";

export const QM_PAGE_HEADER_TAG_NAME = "qm-page-header";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Shared topbar + heading header: covers both the menu screen's typographic header (no
 * hero photo) and the promos/contacto utility screens' header — those two are structurally
 * identical (topbar row, big heading, small subtitle below it, bottom rule), differing only
 * in font-size and bound content, so they're one organism with a `titleSize` prop rather
 * than two near-duplicates.
 *
 * Deliberately does NOT reuse `qm-heading`: that atom renders its `eyebrow` line ABOVE
 * `text`, with no "subtitle below title" mode, but this header unconditionally needs the
 * subtitle BELOW the title — a structural mismatch, not a cosmetic one, so wrapping it would
 * misrender content order. Title text is bespoke `qm-wordmark` usage instead (sized via its
 * own `--qm-wordmark-size` extension point), matching `qm-section-header`'s precedent of
 * declining to force a mismatched atom into a shape it wasn't built for.
 *
 * `qm-wordmark` has no native heading tag of its own, so document-outline semantics are
 * added at this organism's own level via `role="heading"`/`aria-level` on a wrapper —
 * never reaching into `qm-wordmark`'s shadow DOM.
 */
export class QmPageHeader extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "topbar-brand" })
  topbarBrand = "";

  @property({ type: String, attribute: "topbar-name" })
  topbarName = "";

  @property({ type: String })
  title = "";

  @property({ type: String })
  subtitle?: string;

  @property({ type: String, attribute: "lang-value" })
  langValue = "";

  @property({ attribute: false })
  langOptions: QmLangOption[] = [];

  @property({ type: String, attribute: "lang-label" })
  langLabel = "";

  @property({ type: String, attribute: "currency-value" })
  currencyValue = "";

  @property({ attribute: false })
  currencyOptions: QmLangOption[] = [];

  @property({ type: String, attribute: "currency-label" })
  currencyLabel = "";

  @property({ type: String, attribute: "title-size", reflect: true })
  titleSize: "lg" | "md" = "lg";

  @property({ type: Number, attribute: "heading-level" })
  headingLevel = 1;

  /** Omits the bottom rule when the following content provides its own visual transition. */
  @property({ type: Boolean, attribute: "hide-separator", reflect: true })
  hideSeparator = false;

  private renderTopbarText() {
    if (this.topbarBrand && this.topbarName) return `${this.topbarBrand} / ${this.topbarName}`;
    return this.topbarBrand || this.topbarName;
  }

  private readonly handleCurrencyChange = (event: CustomEvent<{ value?: string }>) => {
    event.stopPropagation();
    const value = event.detail?.value ?? "";
    this.dispatchEvent(
      new CustomEvent("qm-currency-change", {
        bubbles: true,
        composed: true,
        detail: { value },
      }),
    );
  };

  private renderCurrencySelector(): TemplateResult {
    if (this.currencyOptions.length === 0) return html``;

    return html`
      <qm-lang
        part="currency"
        .value=${this.currencyValue}
        .options=${this.currencyOptions}
        .label=${this.currencyLabel}
        @qm-change=${this.handleCurrencyChange}
      ></qm-lang>
    `;
  }

  render() {
    return html`
      <div part="topbar" class="topbar">
        <span part="topbar-text" class="topbar-text">${this.renderTopbarText()}</span>
        <div class="topbar-controls">
          <qm-lang part="lang" .value=${this.langValue} .options=${this.langOptions} .label=${this.langLabel}></qm-lang>
          ${this.renderCurrencySelector()}
        </div>
      </div>
      <div part="title-wrap" class="title-wrap" role="heading" aria-level=${this.headingLevel}>
        <qm-wordmark part="title" class="title" data-size=${this.titleSize} .text=${this.title}></qm-wordmark>
      </div>
      ${this.subtitle ? html`<p part="subtitle" class="subtitle">${this.subtitle}</p>` : nothing}
      ${this.hideSeparator ? nothing : html`<qm-divider part="rule" class="rule" variant="rule"></qm-divider>`}
    `;
  }
}

export function defineQmPageHeader() {
  defineQmLang();
  defineQmWordmark();
  defineQmDivider();

  if (!customElements.get(QM_PAGE_HEADER_TAG_NAME)) {
    customElements.define(QM_PAGE_HEADER_TAG_NAME, QmPageHeader);
  }
}

export type QmPageHeaderArgs = Partial<
  Pick<
    QmPageHeader,
    | "topbarBrand"
    | "topbarName"
    | "title"
    | "subtitle"
    | "langValue"
    | "langOptions"
    | "langLabel"
    | "currencyValue"
    | "currencyOptions"
    | "currencyLabel"
    | "titleSize"
    | "headingLevel"
    | "hideSeparator"
  >
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-page-header": QmPageHeader;
  }
}
