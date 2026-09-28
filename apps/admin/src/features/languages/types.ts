import { z } from "zod";

import { i18n } from "~/lib/i18n";

export const addLanguageSchema = z.object({
  languageCode: z.string().trim().min(1, i18n.t("languages___Elige un idioma")),
});
export type AddLanguageFormValues = z.infer<typeof addLanguageSchema>;
