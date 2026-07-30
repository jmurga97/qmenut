import { html } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";
import { defineQmStampGrid } from "../../molecules/qm-stamp-grid";

export const QM_LOYALTY_CARD_TAG_NAME = "qm-loyalty-card";

const componentStyles = createComponentStyles(componentStylesText);

export class QmLoyaltyCard extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "restaurant-name" }) restaurantName = "";
  @property({ type: String }) email = "";
  @property({ type: Number }) balance = 0;
  @property({ type: Number }) target = 0;
  @property({ type: Number, attribute: "animated-index" }) animatedIndex = -1;
  @property({ type: String, attribute: "progress-label" }) progressLabel = "";
  @property({ type: String, attribute: "grid-label" }) gridLabel = "";
  @property({ type: String, attribute: "stamp-label" }) stampLabel = "";
  @property({ type: Boolean, attribute: "stamp-open", reflect: true }) stampOpen = false;
  @property({ type: Boolean, reflect: true }) redeemed = false;
  @property({ type: String, attribute: "redeemed-label" }) redeemedLabel = "";
  @property({ type: String, attribute: "redeemed-reward" }) redeemedReward = "";
  @property({ type: String, attribute: "redeemed-footer" }) redeemedFooter = "";

  private readonly handleStamp = () => this.postEvent({ name: "qm-stamp-request", detail: undefined });

  render() {
    const target = Math.max(0, Math.floor(this.target));
    const filled = Math.min(target, Math.max(0, Math.floor(this.balance)));

    if (this.redeemed) {
      return html`
        <article class="card card--redeemed" aria-live="polite">
          <div class="check" aria-hidden="true">✓</div>
          <p class="eyebrow">${this.redeemedLabel}</p>
          <h2 class="reward-name">${this.redeemedReward}</h2>
          <qm-stamp-grid total=${target} filled="0" aria-label=${this.gridLabel}></qm-stamp-grid>
          <p class="redeemed-footer">${this.redeemedFooter}</p>
        </article>
      `;
    }
    const stampAction = this.renderStampAction();

    return html`
      <article class="card">
        <header>
          <h2>${this.restaurantName}</h2>
          <span class="email">${this.email}</span>
        </header>
        <div class="progress">
          <span class="eyebrow">${this.progressLabel}</span>
          <strong>${filled}/${target}</strong>
        </div>
        <qm-stamp-grid
          .total=${target}
          .filled=${filled}
          .animatedIndex=${this.animatedIndex}
          .ariaLabel=${this.gridLabel}
        ></qm-stamp-grid>
        ${stampAction}
        <div class="stamp-panel"><slot name="stamp-panel"></slot></div>
        <div class="rewards"><slot name="rewards"></slot></div>
      </article>
    `;
  }

  private renderStampAction() {
    if (this.stampOpen) return html``;
    return html`
      <button class="stamp-action" type="button" @click=${this.handleStamp}>
        <span class="stamp-glyph" aria-hidden="true"></span>${this.stampLabel}
      </button>
    `;
  }
}

export function defineQmLoyaltyCard() {
  defineQmStampGrid();
  if (!customElements.get(QM_LOYALTY_CARD_TAG_NAME)) {
    customElements.define(QM_LOYALTY_CARD_TAG_NAME, QmLoyaltyCard);
  }
}

export type QmLoyaltyCardArgs = Partial<
  Pick<
    QmLoyaltyCard,
    | "restaurantName"
    | "email"
    | "balance"
    | "target"
    | "animatedIndex"
    | "progressLabel"
    | "gridLabel"
    | "stampLabel"
    | "stampOpen"
    | "redeemed"
    | "redeemedLabel"
    | "redeemedReward"
    | "redeemedFooter"
  >
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-loyalty-card": QmLoyaltyCard;
  }
}
