import { z } from "zod";

import { hhmmToMinutes } from "./services";

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const TIMEZONE_OPTIONS = [
  { id: "Europe/Madrid", label: "España peninsular — Madrid" },
  { id: "Atlantic/Canary", label: "España — Islas Canarias" },
  { id: "Europe/Lisbon", label: "Portugal — Lisboa" },
  { id: "Europe/London", label: "Reino Unido — Londres" },
  { id: "Europe/Paris", label: "Francia — París" },
  { id: "Europe/Berlin", label: "Alemania — Berlín" },
  { id: "Europe/Rome", label: "Italia — Roma" },
  { id: "Europe/Amsterdam", label: "Países Bajos — Ámsterdam" },
  { id: "Europe/Brussels", label: "Bélgica — Bruselas" },
  { id: "Europe/Zurich", label: "Suiza — Zúrich" },
  { id: "Europe/Athens", label: "Grecia — Atenas" },
  { id: "America/New_York", label: "EE. UU. — Nueva York" },
  { id: "America/Chicago", label: "EE. UU. — Chicago" },
  { id: "America/Denver", label: "EE. UU. — Denver" },
  { id: "America/Los_Angeles", label: "EE. UU. — Los Ángeles" },
  { id: "America/Mexico_City", label: "México — Ciudad de México" },
  { id: "America/Bogota", label: "Colombia — Bogotá" },
  { id: "America/Buenos_Aires", label: "Argentina — Buenos Aires" },
  { id: "UTC", label: "UTC" },
];
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Hora no válida");
const coordinateText = ({ min, max, label }: { min: number; max: number; label: string }) =>
  z
    .string()
    .trim()
    .refine((value) => !value || Number.isFinite(Number(value)), `${label} no válida`)
    .refine((value) => !value || (Number(value) >= min && Number(value) <= max), `${label} fuera de rango`);
const scheduleSchema = z
  .object({ dayOfWeek: z.number().int().min(1).max(7), enabled: z.boolean(), open: time, close: time })
  .refine((row) => !row.enabled || hhmmToMinutes(row.close) >= hhmmToMinutes(row.open), {
    path: ["close"],
    message: "El cierre debe ser posterior a la apertura",
  });
export const branchFormSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    address: z.string().trim(),
    latitude: coordinateText({ min: -90, max: 90, label: "Latitud" }),
    longitude: coordinateText({ min: -180, max: 180, label: "Longitud" }),
    phone: z.string().trim(),
    whatsapp: z.string().trim(),
    logoUrl: z
      .string()
      .trim()
      .refine(
        (value) => !value || (z.url().safeParse(value).success && value.startsWith("https://")),
        "La URL debe empezar por https://",
      ),
    legalName: z.string().trim(),
    taxId: z.string().trim(),
    legalAddress: z.string().trim(),
    dataProtectionEmail: z
      .string()
      .trim()
      .refine((value) => !value || z.email().safeParse(value).success, "Email no válido"),
    timezone: z.string().trim().min(1, "La zona horaria es obligatoria"),
    schedules: z.array(scheduleSchema).length(7),
  })
  .superRefine((value, context) => {
    if (Boolean(value.latitude) === Boolean(value.longitude)) return;

    context.addIssue({
      code: "custom",
      message: "Selecciona una dirección para completar la ubicación del mapa",
      path: [value.latitude ? "longitude" : "latitude"],
    });
  });
export type BranchFormValues = z.infer<typeof branchFormSchema>;
