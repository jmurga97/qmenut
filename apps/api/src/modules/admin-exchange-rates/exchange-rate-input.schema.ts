import { z } from "zod";

function isDecimalRate(value: string): boolean {
  const separator = value.indexOf(".");
  const integerPart = separator === -1 ? value : value.slice(0, separator);

  if (!/^\d+$/.test(integerPart)) {
    return false;
  }

  if (separator === -1) {
    return true;
  }

  const fractionPart = value.slice(separator + 1);

  return /^\d{1,6}$/.test(fractionPart);
}

function isPositiveDecimal(value: string): boolean {
  return /[1-9]/.test(value.replace(".", ""));
}

function normalizeDecimal(value: string): string {
  const separator = value.indexOf(".");
  const integerPart = separator === -1 ? value : value.slice(0, separator);
  let integer = integerPart;
  let fraction = separator === -1 ? "" : value.slice(separator + 1);

  while (integer.length > 1 && integer.startsWith("0")) {
    integer = integer.slice(1);
  }

  while (fraction.endsWith("0")) {
    fraction = fraction.slice(0, -1);
  }

  return fraction ? `${integer}.${fraction}` : integer;
}

export const restaurantExchangeRateSchema = z
  .string()
  .trim()
  .refine((value) => isDecimalRate(value) && isPositiveDecimal(value), {
    message: "La tasa debe ser un número positivo con hasta seis decimales",
  })
  .transform(normalizeDecimal);

export const exchangeRateSaveInputSchema = z.object({
  isEnabled: z.boolean(),
  rate: restaurantExchangeRateSchema,
});
