import { z } from "zod";

const nullableText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const minuteSchema = z.number().int().min(0).max(1439);

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
  url: z.string().trim().url(),
  position: z.number().int().min(0),
});

export const saveBranchSettingsSchema = z.object({
  branchId: z.string().trim().min(1),
  info: z.object({
    name: z.string().trim().min(1).max(200),
    address: nullableText,
    phone: nullableText,
    whatsapp: nullableText,
    socialLinksJson: nullableText,
  }),
  schedules: z.array(scheduleRowSchema).max(21).default([]),
  photos: z.array(photoRowSchema).max(20).default([]),
});
