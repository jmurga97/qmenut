import { html } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";
import { defineQmBadge } from "../../atoms/qm-badge";

export const QM_REDEEM_WAIT_TAG_NAME = "qm-redeem-wait";
export type QmRedeemWaitStatus = "expired" | "pending" | "rejected";

const componentStyles = createComponentStyles(componentStylesText);

export class QmRedeemWait extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, reflect: true }) status: QmRedeemWaitStatus = "pending";
  @property({ type: String, attribute: "reward-name" }) rewardName = "";
  @property({ type: String }) badge = "";
  @property({ type: String }) title = "";
  @property({ type: String }) hint = "";
  @property({ type: String }) countdown = "";
  @property({ type: String, attribute: "cancel-label" }) cancelLabel = "";
  @property({ type: String, attribute: "retry-label" }) retryLabel = "";

  private readonly handleCancel = () => this.postEvent({ name: "qm-cancel", detail: undefined });
  private readonly handleRetry = () => this.postEvent({ name: "qm-retry", detail: undefined });

  render() {
    const pending = this.status === "pending";
    const indicator = this.renderIndicator();
    return html`
      <section class="card" aria-live="polite" aria-busy=${pending ? "true" : "false"}>
        <qm-badge part="badge" class="badge" .text=${this.badge}></qm-badge>
        <div class=${pending ? "spinner" : "terminal"} aria-hidden="true">${indicator}</div>
        <h2>${this.title}</h2>
        <p class="hint">${this.hint}</p>
        <div class="footer">
          <span class="countdown">${this.countdown}</span>
          <button type="button" @click=${pending ? this.handleCancel : this.handleRetry}>
            ${pending ? this.cancelLabel : this.retryLabel}
          </button>
        </div>
      </section>
    `;
  }

  private renderIndicator() {
    if (this.status === "pending") return html`<span></span>`;
    if (this.status === "expired") return html`0:00`;
    return html`×`;
  }
}

export function defineQmRedeemWait() {
  defineQmBadge();
  if (!customElements.get(QM_REDEEM_WAIT_TAG_NAME)) {
    customElements.define(QM_REDEEM_WAIT_TAG_NAME, QmRedeemWait);
  }
}

export type QmRedeemWaitArgs = Partial<
  Pick<QmRedeemWait, "status" | "rewardName" | "badge" | "title" | "hint" | "countdown" | "cancelLabel" | "retryLabel">
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-redeem-wait": QmRedeemWait;
  }
}
