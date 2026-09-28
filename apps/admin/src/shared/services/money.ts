import { z } from "zod";

import { i18n } from "~/lib/i18n";

const MONEY_INPUT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

export const moneyInputSchema = z
  .string()
  .trim()
  .regex(MONEY_INPUT_PATTERN, i18n.t("shared___Introduce un importe válido"));

export function parseMoneyInput(value: string): number {
  const normalized = value.trim();

  if (!MONEY_INPUT_PATTERN.test(normalized)) {
    return NaN;
  }

  const [whole = "0", fraction = ""] = normalized.split(/[.,]/);
  const minorUnits = Number(`${whole}${fraction.padEnd(2, "0")}`);

  return Number.isSafeInteger(minorUnits) ? minorUnits : NaN;
}

export function formatMoneyInput(minorUnits: number | null | undefined): string {
  if (minorUnits === null || minorUnits === undefined) {
    return "";
  }

  if (!Number.isSafeInteger(minorUnits)) {
    return "";
  }

  const sign = minorUnits < 0 ? "-" : "";
  const digits = String(Math.abs(minorUnits)).padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/^0+(?=\d)/, "");
  const fraction = digits.slice(-2);

  if (fraction === "00") return `${sign}${whole}`;
  const decimal = new Intl.NumberFormat(i18n.resolvedLanguage ?? "es")
    .formatToParts(1.1)
    .find(({ type }) => type === "decimal")?.value;
  return `${sign}${whole}${decimal ?? "."}${fraction}`;
}

export function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat(i18n.resolvedLanguage ?? "es", { currency, style: "currency" }).format(minorUnits / 100);
}
