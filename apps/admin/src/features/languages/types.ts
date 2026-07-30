import { z } from "zod";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type TranslationsCatalog = RouterOutputs["admin"]["translations"]["list"];
export const addLanguageSchema = z.object({
  languageCode: z.string().trim().min(1, "Elige un idioma"),
  autoTranslate: z.boolean(),
});
export const translationRowSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(["category", "dish", "ingredient", "variant_group", "variant_option"]),
  field: z.enum(["description", "name"]),
  fieldLabel: z.string(),
  groupPath: z.string(),
  base: z.string().nullable(),
  source: z.enum(["machine", "manual"]).nullable(),
  status: z.enum(["ok", "pending_update"]).nullable(),
  value: z.string(),
});
export const translationsSchema = z.object({ rows: z.array(translationRowSchema) });
export type AddLanguageFormValues = z.infer<typeof addLanguageSchema>;
export type TranslationRow = z.infer<typeof translationRowSchema>;
export type TranslationsFormValues = z.infer<typeof translationsSchema>;
