import { z } from "zod";

import { i18n } from "~/lib/i18n";

export const TIMEZONE_OPTIONS = [
  { id: "Europe/Madrid", label: i18n.t("branch___España peninsular — Madrid") },
  { id: "Atlantic/Canary", label: i18n.t("branch___España — Islas Canarias") },
  { id: "Europe/Lisbon", label: i18n.t("branch___Portugal — Lisboa") },
  { id: "Europe/London", label: i18n.t("branch___Reino Unido — Londres") },
  { id: "Europe/Paris", label: i18n.t("branch___Francia — París") },
  { id: "Europe/Berlin", label: i18n.t("branch___Alemania — Berlín") },
  { id: "Europe/Rome", label: i18n.t("branch___Italia — Roma") },
  { id: "Europe/Amsterdam", label: i18n.t("branch___Países Bajos — Ámsterdam") },
  { id: "Europe/Brussels", label: i18n.t("branch___Bélgica — Bruselas") },
  { id: "Europe/Zurich", label: i18n.t("branch___Suiza — Zúrich") },
  { id: "Europe/Athens", label: i18n.t("branch___Grecia — Atenas") },
  { id: "America/New_York", label: i18n.t("branch___EE. UU. — Nueva York") },
  { id: "America/Chicago", label: i18n.t("branch___EE. UU. — Chicago") },
  { id: "America/Denver", label: i18n.t("branch___EE. UU. — Denver") },
  { id: "America/Los_Angeles", label: i18n.t("branch___EE. UU. — Los Ángeles") },
  { id: "America/Mexico_City", label: i18n.t("branch___México — Ciudad de México") },
  { id: "America/Bogota", label: i18n.t("branch___Colombia — Bogotá") },
  { id: "America/Buenos_Aires", label: i18n.t("branch___Argentina — Buenos Aires") },
  { id: "UTC", label: i18n.t("branch___UTC") },
];
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, i18n.t("branch___Hora no válida"));
const socialUrl = z
  .string()
  .trim()
  .refine((value) => !value || z.url().safeParse(value).success, i18n.t("branch___URL no válida"));
const coordinateText = ({ min, max, label }: { min: number; max: number; label: string }) =>
  z
    .string()
    .trim()
    .refine((value) => !value || Number.isFinite(Number(value)), i18n.t("branch___{{label}} no válida", { label }))
    .refine(
      (value) => !value || (Number(value) >= min && Number(value) <= max),
      i18n.t("branch___{{label}} fuera de rango", { label }),
    );
// Un cierre anterior a la apertura cruza la medianoche (18:00 → 00:00), como las ventanas de promociones.
const scheduleSchema = z.object({ dayOfWeek: z.number().int().min(1).max(7), open: time, close: time });
export const branchFormSchema = z
  .object({
    name: z.string().trim().min(1, i18n.t("branch___El nombre es obligatorio")),
    address: z.string().trim(),
    latitude: coordinateText({ min: -90, max: 90, label: i18n.t("branch___Latitud") }),
    longitude: coordinateText({ min: -180, max: 180, label: i18n.t("branch___Longitud") }),
    phone: z.string().trim(),
    whatsapp: z.string().trim(),
    logoUrl: z
      .string()
      .trim()
      .refine(
        (value) => !value || (z.url().safeParse(value).success && value.startsWith("https://")),
        i18n.t("branch___La URL debe empezar por https://"),
      ),
    legalName: z.string().trim(),
    taxId: z.string().trim(),
    socials: z.array(z.object({ url: socialUrl })).max(10, i18n.t("branch___Máximo 10 redes sociales")),
    dataProtectionEmail: z
      .string()
      .trim()
      .refine((value) => !value || z.email().safeParse(value).success, i18n.t("branch___Email no válido")),
    timezone: z.string().trim().min(1, i18n.t("branch___La zona horaria es obligatoria")),
    schedules: z.array(scheduleSchema).max(21),
  })
  .superRefine((value, context) => {
    if (Boolean(value.latitude) === Boolean(value.longitude)) return;

    context.addIssue({
      code: "custom",
      message: i18n.t("branch___Selecciona una dirección para completar la ubicación del mapa"),
      path: [value.latitude ? "longitude" : "latitude"],
    });
  });
export type BranchFormValues = z.infer<typeof branchFormSchema>;
