import { html } from "lit";
import { property, query } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";

export const QM_CODE_INPUT_TAG_NAME = "qm-code-input";

export type QmCodeInputStatus = "already" | "error" | "idle" | "submitting" | "throttled";
export interface QmCodeInputEventDetail {
  value: string;
}

const componentStyles = createComponentStyles(componentStylesText);
let instanceCount = 0;

export class QmCodeInput extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String }) value = "";
  @property({ type: String, reflect: true }) status: QmCodeInputStatus = "idle";
  @property({ type: String }) title = "";
  @property({ type: String }) hint = "";
  @property({ type: String }) footnote = "";
  @property({ type: String }) message = "";
  @property({ type: String, attribute: "input-label" }) inputLabel = "";
  @property({ type: Boolean, reflect: true }) disabled = false;

  @query("input") private inputElement!: HTMLInputElement;
  private readonly inputId = `qm-code-input-${++instanceCount}`;

  private readonly handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.value.replaceAll(/\D/g, "").slice(0, 4);
    this.postEvent<QmCodeInputEventDetail>({ name: "qm-input", detail: { value } });
    if (value.length === 4) {
      this.postEvent<QmCodeInputEventDetail>({ name: "qm-complete", detail: { value } });
    }
  };

  private readonly focusInput = () => this.inputElement.focus();

  render() {
    const activeIndex = Math.min(this.value.length, 3);

    return html`
      <section class="panel" aria-live="polite">
        <h2>${this.title}</h2>
        <p class="hint">${this.hint}</p>
        <label class="sr-only" for=${this.inputId}>${this.inputLabel}</label>
        <input
          id=${this.inputId}
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="4"
          .value=${this.value}
          ?disabled=${this.disabled || this.status === "submitting" || this.status === "already"}
          aria-invalid=${this.status === "error" ? "true" : "false"}
          aria-describedby=${`${this.inputId}-message ${this.inputId}-footnote`}
          @input=${this.handleInput}
        />
        <button class="boxes" type="button" @click=${this.focusInput} tabindex="-1" aria-hidden="true">
          ${Array.from(
            { length: 4 },
            (_, index) => html`
              <span class=${`box ${index === activeIndex && this.value.length < 4 ? "box--active" : ""}`}>
                ${this.value[index] ?? ""}
              </span>
            `,
          )}
        </button>
        <p id=${`${this.inputId}-message`} class="message">${this.message}</p>
        <p id=${`${this.inputId}-footnote`} class="footnote">${this.footnote}</p>
      </section>
    `;
  }
}

export function defineQmCodeInput() {
  if (!customElements.get(QM_CODE_INPUT_TAG_NAME)) {
    customElements.define(QM_CODE_INPUT_TAG_NAME, QmCodeInput);
  }
}

export type QmCodeInputArgs = Partial<
  Pick<QmCodeInput, "value" | "status" | "title" | "hint" | "footnote" | "message" | "inputLabel" | "disabled">
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-code-input": QmCodeInput;
  }
}
