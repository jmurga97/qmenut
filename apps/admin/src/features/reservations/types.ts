import { z } from "zod";

import { i18n } from "~/lib/i18n";

import type { RouterOutputs } from "~/lib/trpc";

type ReservationsOutputs = RouterOutputs["admin"]["reservations"];
export type ReservationDay = ReservationsOutputs["day"];
export type StaffReservation = ReservationDay["reservations"][number];
export type ReservationStatus = StaffReservation["status"];
export type ReservationClosure = ReservationsOutputs["closures"][number];
export type ReservationSettingsData = ReservationsOutputs["settings"];

// An unreadable ?date falls back to "" (the restaurant's today) instead of an error page.
export const reservationsSearchSchema = z.object({ date: z.iso.date().optional().catch("") });

const slotFormSchema = z.object({ weekday: z.number(), time: z.string().regex(/^\d{2}:\d{2}$/) });

const wholeNumber = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, i18n.t("reservations___Escribe un número entero"))
    .refine((value) => Number(value) >= min && Number(value) <= max, {
      message: i18n.t("reservations___Indica un número entre {{min}} y {{max}}", { min, max }),
    });

export const reservationSettingsFormSchema = z
  .object({
    isEnabled: z.boolean(),
    slotCapacity: wholeNumber(1, 500),
    onlinePartyLimit: wholeNumber(1, 50),
    windowDays: wholeNumber(1, 365),
    leadTimeHours: wholeNumber(0, 168),
    responseTimeHours: wholeNumber(1, 168),
    checkBeforeHours: wholeNumber(1, 48),
    checkDeadlineMinutes: wholeNumber(0, 2880),
    slots: z.array(slotFormSchema),
  })
  .refine((values) => Number(values.checkDeadlineMinutes) < Number(values.checkBeforeHours) * 60, {
    message: i18n.t("reservations___El plazo para confirmar debe acabar después de enviar la confirmación"),
    path: ["checkDeadlineMinutes"],
  })
  .refine((values) => !values.isEnabled || values.slots.length > 0, {
    message: i18n.t("reservations___Añade al menos una hora para activar las reservas"),
    path: ["slots"],
  });

export type ReservationSettingsFormValues = z.infer<typeof reservationSettingsFormSchema>;
