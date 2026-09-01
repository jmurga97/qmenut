import { z } from "zod";

const RATE_PATTERN = /^\d+(?:\.\d{1,6})?$/;

export const exchangeRateFormSchema = z.object({
  isEnabled: z.boolean(),
  rate: z
    .string()
    .trim()
    .refine((value) => RATE_PATTERN.test(value) && /[1-9]/.test(value.replace(".", "")), {
      message: "Introduce una tasa positiva con hasta seis decimales",
    }),
});

export type ExchangeRateFormValues = z.infer<typeof exchangeRateFormSchema>;
