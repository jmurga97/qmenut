import { z } from "zod";

const nullableText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const nullableEmail = nullableText.refine(
  (value) => value === null || z.email().safeParse(value).success,
  "Email no válido",
);

const minuteSchema = z.number().int().min(0).max(1439);
const supportedTimeZones = new Set([...Intl.supportedValuesOf("timeZone"), "UTC"]);

export const scheduleRowSchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    openMinute: minuteSchema,
    closeMinute: minuteSchema,
  })
  .refine((row) => row.closeMinute >= row.openMinute, {
    message: "La hora de cierre debe ser posterior a la de apertura",
  });

export const photoRowSchema = z.object({
  url: z.url().trim(),
  position: z.number().int().min(0),
});

export const saveBranchSettingsSchema = z.object({
  branchId: z.string().trim().min(1),
  timezone: z
    .string()
    .trim()
    .refine((value) => supportedTimeZones.has(value), "Zona horaria no válida"),
  info: z.object({
    name: z.string().trim().min(1).max(200),
    address: nullableText,
    phone: nullableText,
    whatsapp: nullableText,
    socialLinksJson: nullableText,
  }),
  legal: z.object({
    dataProtectionEmail: nullableEmail,
    legalAddress: nullableText,
    legalName: nullableText,
    taxId: nullableText,
  }),
  schedules: z.array(scheduleRowSchema).max(21).default([]),
  photos: z.array(photoRowSchema).max(20).default([]),
});
