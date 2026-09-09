import { z } from "zod";

export const addLanguageSchema = z.object({
  languageCode: z.string().trim().min(1, "Elige un idioma"),
});
export type AddLanguageFormValues = z.infer<typeof addLanguageSchema>;
