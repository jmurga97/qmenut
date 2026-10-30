import { i18n } from "~/lib/i18n";
import { DAYS, hhmmToMinutes, minutesToHHMM } from "~/shared/services/week-time";

import type {
  ReservationSettingsData,
  ReservationSettingsFormValues,
  ReservationStatus,
  StaffReservation,
} from "~/features/reservations/types";

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: i18n.t("reservations___Pendiente"),
  accepted: i18n.t("reservations___Aceptada"),
  confirmed: i18n.t("reservations___Confirmada"),
  unconfirmed: i18n.t("reservations___Sin confirmar"),
  declined: i18n.t("reservations___Rechazada"),
  cancelled: i18n.t("reservations___Cancelada"),
};

export const STATUS_TONES = {
  pending: "warning",
  accepted: "neutral",
  confirmed: "success",
  unconfirmed: "error",
  declined: "neutral",
  cancelled: "neutral",
} as const satisfies Record<ReservationStatus, "neutral" | "success" | "warning" | "error">;

const HOLDING = new Set<ReservationStatus>(["pending", "accepted", "confirmed", "unconfirmed"]);
// Rows that need staff first: requests to answer, then guests who didn't confirm.
const STATUS_ORDER: Record<ReservationStatus, number> = {
  pending: 0,
  unconfirmed: 1,
  accepted: 2,
  confirmed: 3,
  declined: 4,
  cancelled: 5,
};

export function holdsTable(status: ReservationStatus): boolean {
  return HOLDING.has(status);
}

export interface SlotGroup {
  minute: number;
  held: number;
  reservations: StaffReservation[];
}

export function groupBySlot(reservations: StaffReservation[]): SlotGroup[] {
  const groups = new Map<number, StaffReservation[]>();
  for (const reservation of reservations) {
    groups.set(reservation.slotMinute, [...(groups.get(reservation.slotMinute) ?? []), reservation]);
  }

  return [...groups.entries()].map(([minute, rows]) => ({
    minute,
    held: rows.filter((row) => holdsTable(row.status)).length,
    reservations: rows.toSorted((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
  }));
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
    responseTimeHours: String(Math.round(settings.responseTimeMinutes / 60)),
    checkBeforeHours: String(Math.round(settings.checkBeforeMinutes / 60)),
    checkDeadlineMinutes: String(settings.checkDeadlineMinutes),
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
    responseTimeMinutes: Number(values.responseTimeHours) * 60,
    checkBeforeMinutes: Number(values.checkBeforeHours) * 60,
    checkDeadlineMinutes: Number(values.checkDeadlineMinutes),
    slots: [...unique.values()].map((slot) => ({ weekday: slot.weekday, startMinute: hhmmToMinutes(slot.time) })),
  };
}
