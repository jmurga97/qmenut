import { html, nothing } from "lit";
import { property, query } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { FocusableMixin } from "../../../internal/focusable-mixin";
import { QmElement } from "../../../internal/qm-element";

import type { FocusableInterface } from "../../../internal/focusable-mixin";

export const QM_FIELD_TAG_NAME = "qm-field";

const componentStyles = createComponentStyles(componentStylesText);

export type QmFieldType = "text" | "email" | "tel" | "number" | "search" | "password";
export interface QmFieldEventDetail {
  value: string;
  name: string;
}

let instanceCount = 0;

/**
 * Labeled text input: `<label for>` + native `<input>`, matching the "Nombre" field from
 * the design reference. Wraps a label+input pair (not a single delegatable control), so it
 * uses `FocusableMixin` rather than `delegatesFocus`. `inputId` resolves the DOM id the
 * label points at, falling back to `name` and finally a per-instance generated id — always
 * pass `inputId` (or `name`) explicitly when you can; the generated fallback only exists so
 * the label/input pairing is never broken by omission.
 */
export class QmField extends FocusableMixin(QmElement) implements FocusableInterface {
  static styles = [qmHostResetStyles, componentStyles];

  @query("input")
  focusableElement!: HTMLInputElement;

  @property({ type: String })
  label = "";

  @property({ type: String })
  value = "";

  @property({ type: String })
  placeholder = "";

  @property({ type: String })
  type: QmFieldType = "text";

  @property({ type: String })
  name = "";

  @property({ type: Boolean, reflect: true })
  required = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: String, attribute: "input-id" })
  inputId = "";

  @property({ type: String, attribute: "aria-describedby" })
  ariaDescribedby: string | null = null;

  @property({ type: String, attribute: "aria-invalid" })
  ariaInvalid: string | null = null;

  private readonly generatedId = `qm-field-${++instanceCount}`;

  private get resolvedId(): string {
    return this.inputId || this.name || this.generatedId;
  }

  private readonly handleInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    this.postEvent({ name: "qm-input", detail: { value, name: this.name } });
  };

  private readonly handleChange = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    this.postEvent({ name: "qm-change", detail: { value, name: this.name } });
  };

  render() {
    return html`
      <label part="label" class="label" for=${this.resolvedId}>${this.label}</label>
      <input
        part="input"
        id=${this.resolvedId}
        class="input"
        type=${this.type}
        name=${this.name || nothing}
        .value=${this.value}
        placeholder=${this.placeholder || nothing}
        ?required=${this.required}
        ?disabled=${this.disabled}
        aria-describedby=${this.ariaDescribedby ?? nothing}
        aria-invalid=${this.ariaInvalid ?? nothing}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
    `;
  }
}

export function defineQmField() {
  if (!customElements.get(QM_FIELD_TAG_NAME)) {
    customElements.define(QM_FIELD_TAG_NAME, QmField);
  }
}

export type QmFieldArgs = Partial<
  Pick<
    QmField,
    | "label"
    | "value"
    | "placeholder"
    | "type"
    | "name"
    | "required"
    | "disabled"
    | "inputId"
    | "ariaDescribedby"
    | "ariaInvalid"
  >
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-field": QmField;
  }
}
