import { html, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";

export const QM_CALENDAR_TAG_NAME = "qm-calendar";

export type QmCalendarDayState = "available" | "full" | "unavailable";

export interface QmCalendarDay {
  /** YYYY-MM-DD. */
  date: string;
  state: QmCalendarDayState;
}

export interface QmCalendarSelectDetail {
  date: string;
}

export interface QmCalendarMonthDetail {
  /** YYYY-MM. */
  month: string;
}

const componentStyles = createComponentStyles(componentStylesText);

function shiftMonth(month: string, offset: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1 + offset, 1)).toISOString().slice(0, 7);
}

function utcDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/**
 * A month of days, each available, full or unavailable. Only available days can be picked; the
 * state is spoken in each day's label, not only shown. Weeks start on Monday.
 */
export class QmCalendar extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String }) month = "";
  @property({ attribute: false }) days: QmCalendarDay[] = [];
  @property({ type: String }) selected = "";
  @property({ type: String }) locale = "es";
  @property({ type: String, attribute: "min-month" }) minMonth = "";
  @property({ type: String, attribute: "max-month" }) maxMonth = "";
  @property({ type: String, attribute: "previous-label" }) previousLabel = "";
  @property({ type: String, attribute: "next-label" }) nextLabel = "";
  @property({ type: String, attribute: "available-label" }) availableLabel = "";
  @property({ type: String, attribute: "full-label" }) fullLabel = "";
  @property({ type: String, attribute: "unavailable-label" }) unavailableLabel = "";

  private changeMonth(offset: number) {
    this.postEvent<QmCalendarMonthDetail>({ name: "qm-month", detail: { month: shiftMonth(this.month, offset) } });
  }

  private renderDay(date: string) {
    const state = this.days.find((day) => day.date === date)?.state ?? "unavailable";
    const stateLabel = { available: this.availableLabel, full: this.fullLabel, unavailable: this.unavailableLabel }[
      state
    ];
    const dateLabel = new Intl.DateTimeFormat(this.locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(utcDate(date));

    return html`
      <button
        type="button"
        class="day"
        data-state=${state}
        aria-pressed=${date === this.selected ? "true" : "false"}
        aria-label=${stateLabel ? `${dateLabel}, ${stateLabel}` : dateLabel}
        ?disabled=${state !== "available"}
        @click=${() => this.postEvent<QmCalendarSelectDetail>({ name: "qm-select", detail: { date } })}
      >
        ${Number(date.slice(8))}
      </button>
    `;
  }

  render() {
    if (!this.month) return nothing;

    const first = utcDate(`${this.month}-01`);
    const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const leadingBlanks = (first.getUTCDay() + 6) % 7;
    const title = new Intl.DateTimeFormat(this.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
      first,
    );
    // 2024-01-01 was a Monday.
    const weekdays = Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(this.locale, { weekday: "narrow", timeZone: "UTC" }).format(
        utcDate(`2024-01-0${index + 1}`),
      ),
    );
    const dates = Array.from(
      { length: daysInMonth },
      (_, index) => `${this.month}-${String(index + 1).padStart(2, "0")}`,
    );

    return html`
      <section class="calendar">
        <header class="header">
          <button
            type="button"
            class="nav"
            aria-label=${this.previousLabel}
            ?disabled=${Boolean(this.minMonth) && this.month <= this.minMonth}
            @click=${() => this.changeMonth(-1)}
          >
            ‹
          </button>
          <h2 class="title" aria-live="polite">${title}</h2>
          <button
            type="button"
            class="nav"
            aria-label=${this.nextLabel}
            ?disabled=${Boolean(this.maxMonth) && this.month >= this.maxMonth}
            @click=${() => this.changeMonth(1)}
          >
            ›
          </button>
        </header>
        <div class="grid">
          ${weekdays.map((weekday) => html`<span class="weekday" aria-hidden="true">${weekday}</span>`)}
          ${Array.from({ length: leadingBlanks }, () => html`<span aria-hidden="true"></span>`)}
          ${dates.map((date) => this.renderDay(date))}
        </div>
      </section>
    `;
  }
}

export function defineQmCalendar() {
  if (!customElements.get(QM_CALENDAR_TAG_NAME)) {
    customElements.define(QM_CALENDAR_TAG_NAME, QmCalendar);
  }
}

export type QmCalendarArgs = Partial<
  Pick<
    QmCalendar,
    | "month"
    | "days"
    | "selected"
    | "locale"
    | "minMonth"
    | "maxMonth"
    | "previousLabel"
    | "nextLabel"
    | "availableLabel"
    | "fullLabel"
    | "unavailableLabel"
  >
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-calendar": QmCalendar;
  }
}
