import { html } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";

export const QM_REWARD_ROW_TAG_NAME = "qm-reward-row";
export interface QmRewardEventDetail {
  rewardId: string;
}

const componentStyles = createComponentStyles(componentStylesText);

export class QmRewardRow extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "reward-id" }) rewardId = "";
  @property({ type: String }) name = "";
  @property({ type: Number }) cost = 0;
  @property({ type: Number }) remaining = 0;
  @property({ type: Boolean, reflect: true }) unlocked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) busy = false;
  @property({ type: String, attribute: "stamps-label" }) stampsLabel = "";
  @property({ type: String, attribute: "remaining-label" }) remainingLabel = "";
  @property({ type: String, attribute: "redeem-label" }) redeemLabel = "";
  @property({ type: String, attribute: "busy-label" }) busyLabel = "";

  private readonly handleRedeem = () => {
    this.postEvent<QmRewardEventDetail>({ name: "qm-redeem", detail: { rewardId: this.rewardId } });
  };

  render() {
    const rewardAction = this.renderRewardAction();
    return html`
      <article class="row">
        <div class="cost"><strong>${this.cost}</strong><span>${this.stampsLabel}</span></div>
        <div class="copy">
          <h3>${this.name}</h3>
          ${rewardAction}
        </div>
      </article>
    `;
  }

  private renderRewardAction() {
    if (!this.unlocked) {
      return html`<span class="remaining">${this.remainingLabel}</span>`;
    }
    const label = this.busy ? this.busyLabel : this.redeemLabel;
    return html`
      <button type="button" ?disabled=${this.disabled || this.busy} @click=${this.handleRedeem}>${label}</button>
    `;
  }
}

export function defineQmRewardRow() {
  if (!customElements.get(QM_REWARD_ROW_TAG_NAME)) {
    customElements.define(QM_REWARD_ROW_TAG_NAME, QmRewardRow);
  }
}

export type QmRewardRowArgs = Partial<
  Pick<
    QmRewardRow,
    | "rewardId"
    | "name"
    | "cost"
    | "remaining"
    | "unlocked"
    | "disabled"
    | "busy"
    | "stampsLabel"
    | "remainingLabel"
    | "redeemLabel"
    | "busyLabel"
  >
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-reward-row": QmRewardRow;
  }
}
