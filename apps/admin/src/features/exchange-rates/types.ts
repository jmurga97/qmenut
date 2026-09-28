import { z } from "zod";

import { i18n } from "~/lib/i18n";

const RATE_PATTERN = /^\d+(?:[.,]\d{1,6})?$/;

export const exchangeRateFormSchema = z.object({
  isEnabled: z.boolean(),
  rate: z
    .string()
    .trim()
    .refine((value) => RATE_PATTERN.test(value) && /[1-9]/.test(value.replace(/[.,]/, "")), {
      message: i18n.t("exchangeRates___Introduce una tasa positiva con hasta seis decimales"),
    })
    .transform((value) => value.replace(",", ".")),
});

export type ExchangeRateFormValues = z.infer<typeof exchangeRateFormSchema>;
