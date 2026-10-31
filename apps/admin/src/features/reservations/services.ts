import { i18n } from "~/lib/i18n";
import { DAYS, hhmmToMinutes, minutesToHHMM } from "~/shared/services/week-time";

import type {
  ReservationSettingsData,
  ReservationSettingsFormValues,
  ReservationStatus,
  StaffReservation,
} from "~/features/reservations/types";

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: i18n.t("reservations___Sin confirmar"),
  confirmed: i18n.t("reservations___Confirmada"),
  cancelled: i18n.t("reservations___Cancelada"),
};

export const STATUS_TONES = {
  pending: "warning",
  confirmed: "success",
  cancelled: "neutral",
} as const satisfies Record<ReservationStatus, "neutral" | "success" | "warning" | "error">;

// Both hold a table (ADR 0008): an unconfirmed guest is still expected.
const HOLDING = new Set<ReservationStatus>(["pending", "confirmed"]);
// Guests who didn't confirm first, so staff see who may not come.
const STATUS_ORDER: Record<ReservationStatus, number> = { pending: 0, confirmed: 1, cancelled: 2 };

export function holdsTable(status: ReservationStatus): boolean {
  return HOLDING.has(status);
}

export interface SlotGroup {
  minute: number;
  held: number;
  people: number;
  reservations: StaffReservation[];
}

export function groupBySlot(reservations: StaffReservation[]): SlotGroup[] {
  const groups = new Map<number, StaffReservation[]>();
  for (const reservation of reservations) {
    groups.set(reservation.slotMinute, [...(groups.get(reservation.slotMinute) ?? []), reservation]);
  }

  return [...groups.entries()].map(([minute, rows]) => {
    const holding = rows.filter((row) => holdsTable(row.status));

    return {
      minute,
      held: holding.length,
      people: holding.reduce((total, row) => total + row.partySize, 0),
      reservations: rows.toSorted((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    };
  });
}

export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Local dates are already the restaurant's: format them in UTC so the staff device's timezone can't shift them. */
export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export const formatSlot = minutesToHHMM;

/** The admin lists days Monday first (DAYS); reservation_slots.weekday is 0 for Sunday. */
export const WEEKDAYS = DAYS.map((label, index) => ({ label, weekday: (index + 1) % 7 }));

export function toSettingsFormValues({ settings, slots }: ReservationSettingsData): ReservationSettingsFormValues {
  return {
    isEnabled: settings.isEnabled,
    slotCapacity: settings.slotCapacity === null ? "" : String(settings.slotCapacity),
    onlinePartyLimit: String(settings.onlinePartyLimit),
    windowDays: String(settings.windowDays),
    leadTimeHours: String(Math.round(settings.leadTimeMinutes / 60)),
    checkBeforeHours: String(Math.round(settings.checkBeforeMinutes / 60)),
    slots: slots.map((slot) => ({ weekday: slot.weekday, time: minutesToHHMM(slot.startMinute) })),
  };
}

export function toSettingsInput(branchId: string, values: ReservationSettingsFormValues) {
  const unique = new Map(values.slots.map((slot) => [`${slot.weekday}:${slot.time}`, slot]));

  return {
    branchId,
    isEnabled: values.isEnabled,
    slotCapacity: Number(values.slotCapacity),
    onlinePartyLimit: Number(values.onlinePartyLimit),
    windowDays: Number(values.windowDays),
    leadTimeMinutes: Number(values.leadTimeHours) * 60,
    checkBeforeMinutes: Number(values.checkBeforeHours) * 60,
    slots: [...unique.values()].map((slot) => ({ weekday: slot.weekday, startMinute: hhmmToMinutes(slot.time) })),
  };
}
