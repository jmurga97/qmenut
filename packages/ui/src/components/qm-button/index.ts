import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../internal/base-styles";
import { createComponentStyles } from "../../internal/component-styles";

export const QM_BUTTON_TAG_NAME = "qm-button";

const componentStyles = createComponentStyles(componentStylesText);

export type QmButtonVariant = "primary" | "secondary" | "ghost";
export type QmButtonSize = "sm" | "md";

/** Primary CTA, styled after the reference's "Enviar →" button. */
export class QmButton extends LitElement {
  static shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String })
  variant: QmButtonVariant = "primary";

  @property({ type: String })
  size: QmButtonSize = "md";

  @property({ type: String })
  type: "button" | "submit" | "reset" = "button";

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: String, attribute: "aria-label" })
  ariaLabel: string | null = null;

  render() {
    return html`
      <button
        part="button"
        data-variant=${this.variant}
        data-size=${this.size}
        type=${this.type}
        ?disabled=${this.disabled}
        aria-label=${this.ariaLabel ?? nothing}
      >
        <span class="icon" part="icon-start"><slot name="icon-start"></slot></span>
        <span class="label" part="label"><slot></slot></span>
        <span class="icon" part="icon-end"><slot name="icon-end"></slot></span>
      </button>
    `;
  }
}

export function defineQmButton() {
  if (!customElements.get(QM_BUTTON_TAG_NAME)) {
    customElements.define(QM_BUTTON_TAG_NAME, QmButton);
  }
}

export type QmButtonArgs = Partial<Pick<QmButton, "variant" | "size" | "type" | "disabled" | "ariaLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-button": QmButton;
  }
}
