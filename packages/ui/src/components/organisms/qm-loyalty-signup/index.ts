import { html } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";

export const QM_LOYALTY_SIGNUP_TAG_NAME = "qm-loyalty-signup";
export interface QmLoyaltyEmailEventDetail {
  email: string;
}
export interface QmLoyaltyConsentChangeEventDetail {
  accepted: boolean;
}
export interface QmLoyaltySubmitEventDetail extends QmLoyaltyEmailEventDetail {
  consentAccepted: boolean;
}

const componentStyles = createComponentStyles(componentStylesText);
let instanceCount = 0;

export class QmLoyaltySignup extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String }) pitch = "";
  @property({ type: String }) explainer = "";
  @property({ type: String }) email = "";
  @property({ type: String, attribute: "email-label" }) emailLabel = "";
  @property({ type: String, attribute: "email-placeholder" }) emailPlaceholder = "";
  @property({ type: String, attribute: "submit-label" }) submitLabel = "";
  @property({ type: Boolean, attribute: "consent-accepted" }) consentAccepted = false;
  @property({ type: String, attribute: "consent-label" }) consentLabel = "";
  @property({ type: String, attribute: "privacy-href" }) privacyHref = "/privacidad";
  @property({ type: String, attribute: "privacy-link-label" }) privacyLinkLabel = "";
  @property({ type: String, attribute: "consent-error" }) consentError = "";
  @property({ type: String }) reassurance = "";
  @property({ type: String }) error = "";
  @property({ type: Boolean, reflect: true }) busy = false;
  private readonly inputId = `qm-loyalty-email-${++instanceCount}`;
  private readonly consentId = `${this.inputId}-consent`;
  private consentInvalid = false;

  private readonly handleInput = (event: Event) => {
    this.postEvent<QmLoyaltyEmailEventDetail>({
      name: "qm-input",
      detail: { email: (event.target as HTMLInputElement).value },
    });
  };

  private readonly handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (!this.consentAccepted) {
      this.consentInvalid = true;
      this.requestUpdate();
      this.renderRoot.querySelector<HTMLInputElement>(`#${this.consentId}`)?.focus();
      return;
    }

    this.postEvent<QmLoyaltySubmitEventDetail>({
      name: "qm-submit",
      detail: { consentAccepted: true, email: this.email.trim() },
    });
  };

  private readonly handleConsentChange = (event: Event) => {
    this.consentAccepted = (event.target as HTMLInputElement).checked;
    this.consentInvalid = false;
    this.postEvent<QmLoyaltyConsentChangeEventDetail>({
      name: "qm-consent-change",
      detail: { accepted: this.consentAccepted },
    });
  };

  render() {
    return html`
      <section class="card" aria-labelledby=${`${this.inputId}-title`}>
        <div class="stamp" aria-hidden="true"></div>
        <h2 id=${`${this.inputId}-title`}>${this.pitch}</h2>
        <p class="explainer">${this.explainer}</p>
        <form @submit=${this.handleSubmit}>
          <label for=${this.inputId}>${this.emailLabel}</label>
          <input
            id=${this.inputId}
            name="email"
            type="email"
            autocomplete="email"
            required
            maxlength="254"
            .value=${this.email}
            placeholder=${this.emailPlaceholder}
            ?disabled=${this.busy}
            aria-invalid=${this.error ? "true" : "false"}
            aria-describedby=${`${this.inputId}-error ${this.inputId}-reassurance`}
            @input=${this.handleInput}
          />
          <div class="consent">
            <input
              id=${this.consentId}
              type="checkbox"
              .checked=${this.consentAccepted}
              aria-invalid=${this.consentInvalid ? "true" : "false"}
              aria-required="true"
              aria-describedby=${`${this.consentId}-error`}
              ?disabled=${this.busy}
              @change=${this.handleConsentChange}
            />
            <label for=${this.consentId}>
              ${this.consentLabel}
              <a href=${this.privacyHref}>${this.privacyLinkLabel}</a>
            </label>
          </div>
          <p id=${`${this.consentId}-error`} class="consent-error" aria-live="polite" ?hidden=${!this.consentInvalid}>
            ${this.consentError}
          </p>
          <p id=${`${this.inputId}-error`} class="error" aria-live="polite">${this.error}</p>
          <button type="submit" ?disabled=${this.busy}>${this.submitLabel}</button>
        </form>
        <p id=${`${this.inputId}-reassurance`} class="reassurance">${this.reassurance}</p>
      </section>
    `;
  }
}

export function defineQmLoyaltySignup() {
  if (!customElements.get(QM_LOYALTY_SIGNUP_TAG_NAME)) {
    customElements.define(QM_LOYALTY_SIGNUP_TAG_NAME, QmLoyaltySignup);
  }
}

export type QmLoyaltySignupArgs = Partial<
  Pick<
    QmLoyaltySignup,
    | "pitch"
    | "explainer"
    | "email"
    | "emailLabel"
    | "emailPlaceholder"
    | "submitLabel"
    | "consentAccepted"
    | "consentLabel"
    | "privacyHref"
    | "privacyLinkLabel"
    | "consentError"
    | "reassurance"
    | "error"
    | "busy"
  >
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-loyalty-signup": QmLoyaltySignup;
  }
}
