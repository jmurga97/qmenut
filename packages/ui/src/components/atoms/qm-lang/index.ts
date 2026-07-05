import { html, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";

export const QM_LANG_TAG_NAME = "qm-lang";

const componentStyles = createComponentStyles(componentStylesText);

export interface QmLangOption {
  value: string;
  label: string;
}

let instanceCount = 0;

/**
 * Language dropdown (e.g. "ES ▾"). Wraps a single native `<select>` for accessibility, so
 * uses `delegatesFocus` rather than `FocusableMixin` — same reasoning as `qm-button`.
 *
 * `options` is a plain array prop rather than slot composition, as a deliberate, narrow
 * exception to the general "prefer slots over array props" convention: a shadow-DOM-hosted
 * native `<select>` cannot render slotted light-DOM `<option>` children (no browser support
 * for that), so there is no slot-based way to populate a real `<select>` here.
 *
 * Accessible name: pass `label` to render a real (visually-hidden) `<label for>` pointing at
 * the select — the compliant path per CONTRIBUTING.md RULE 2 ("do not rely solely on
 * aria-label"). `ariaLabel` remains supported as a fallback for callers that don't supply
 * `label`, but `label` takes precedence when both are set.
 */
export class QmLang extends QmElement {
  static shadowRootOptions: ShadowRootInit = {
    ...QmElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  value = "";

  @property({ attribute: false })
  options: QmLangOption[] = [];

  @property({ type: String })
  label = "";

  @property({ type: String, attribute: "select-id" })
  selectId = "";

  @property({ type: String, attribute: "aria-label" })
  ariaLabel: string | null = null;

  private readonly generatedId = `qm-lang-${++instanceCount}`;

  private get resolvedId(): string {
    return this.selectId || this.generatedId;
  }

  private readonly handleChange = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    this.postEvent({ name: "qm-change", detail: { value } });
  };

  render() {
    return html`
      ${this.label ? html`<label part="label" class="label" for=${this.resolvedId}>${this.label}</label>` : nothing}
      <select
        part="select"
        id=${this.resolvedId}
        aria-label=${!this.label ? (this.ariaLabel ?? nothing) : nothing}
        .value=${this.value}
        @change=${this.handleChange}
      >
        ${this.options.map((option) => html`<option value=${option.value}>${option.label}</option>`)}
      </select>
    `;
  }
}

export function defineQmLang() {
  if (!customElements.get(QM_LANG_TAG_NAME)) {
    customElements.define(QM_LANG_TAG_NAME, QmLang);
  }
}

export type QmLangArgs = Partial<Pick<QmLang, "value" | "options" | "label" | "selectId" | "ariaLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-lang": QmLang;
  }
}
