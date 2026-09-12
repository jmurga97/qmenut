import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmChip } from "../../atoms/qm-chip";
import { defineQmPin } from "../../atoms/qm-pin";

export const QM_LOCATION_TAG_NAME = "qm-location";

const componentStyles = createComponentStyles(componentStylesText);

/** Restaurant location card with address, optional opening-hours groups, and contact actions. */
export interface QmLocationValue {
  id?: string;
  name: string;
  addr: string;
  status: string;
  schedule?: QmLocationScheduleGroup[];
  actionsLabel?: string;
  phone?: string;
  phoneHref?: string;
  phoneLabel?: string;
  whatsappHref?: string;
  whatsappLabel?: string;
  mapHref?: string;
  mapLabel?: string;
  menuHref?: string;
  menuLabel?: string;
}

export interface QmLocationScheduleGroup {
  dayLabel: string;
  intervals: string[];
}

export class QmLocation extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmLocationValue;

  private renderAction(href: string | undefined, label: string | undefined) {
    if (!href || !label) return html``;

    const external = href.startsWith("http");
    return html`
      <a
        part="action"
        class="action"
        href=${href}
        target=${external ? "_blank" : nothing}
        rel=${external ? "noreferrer" : nothing}
      >
        ${label}
      </a>
    `;
  }

  private renderSchedule() {
    if (this.value?.schedule === undefined) {
      return html`
        <div class="legacy-status">
          <qm-chip part="status" .text=${this.value?.status ?? ""} variant="default"></qm-chip>
        </div>
      `;
    }

    return html`
      <div part="schedule" class="schedule ${this.value.schedule.length === 0 ? "schedule--empty" : ""}">
        ${
          this.value.schedule.length > 0
            ? this.value.schedule.map(
                (group) => html`
                  <div part="schedule-group" class="schedule-group">
                    <span part="schedule-day" class="schedule-day">${group.dayLabel}</span>
                    <div part="schedule-intervals" class="schedule-intervals">
                      ${group.intervals.map(
                        (interval) => html`<span part="schedule-interval" class="schedule-interval">${interval}</span>`,
                      )}
                    </div>
                  </div>
                `,
              )
            : this.value.status
        }
      </div>
    `;
  }

  render() {
    return html`
      <div part="card" class="card">
        <qm-pin part="pin" class="pin" size="18px" aria-hidden="true"></qm-pin>
        <div class="body">
          <div part="name" class="name">${this.value?.name ?? ""}</div>
          <div part="addr" class="addr">${this.value?.addr ?? ""}</div>
          ${this.renderSchedule()}
          ${this.value?.phone ? html`<div part="phone" class="phone">${this.value.phone}</div>` : nothing}
          <nav part="actions" class="actions" aria-label=${this.value?.actionsLabel ?? "Contact"}>
            ${this.renderAction(this.value?.phoneHref, this.value?.phoneLabel)}
            ${this.renderAction(this.value?.whatsappHref, this.value?.whatsappLabel)}
            ${this.renderAction(this.value?.mapHref, this.value?.mapLabel)}
            ${this.renderAction(this.value?.menuHref, this.value?.menuLabel)}
          </nav>
        </div>
      </div>
    `;
  }
}

export function defineQmLocation() {
  defineQmPin();
  defineQmChip();

  if (!customElements.get(QM_LOCATION_TAG_NAME)) {
    customElements.define(QM_LOCATION_TAG_NAME, QmLocation);
  }
}

export type QmLocationArgs = Partial<Pick<QmLocation, "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-location": QmLocation;
  }
}
