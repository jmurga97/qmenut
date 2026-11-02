const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
const vesFormat = new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES" });
const countFormat = new Intl.NumberFormat("es-VE");
const percentFormat = new Intl.NumberFormat("es-VE", { style: "percent", maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" });
const scheduleDateFormat = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Caracas",
});

export const usd = (cents: number): string => usdFormat.format(cents / 100);
export const ves = (cents: number): string => vesFormat.format(cents / 100);
export const count = (value: number): string => countFormat.format(value);
export const percent = (part: number, whole: number): string => (whole > 0 ? percentFormat.format(part / whole) : "—");
export const date = (ms: number | null): string => (ms ? dateFormat.format(ms) : "—");
export const dateTime = (ms: number | null): string => (ms ? dateTimeFormat.format(ms) : "—");
export const scheduleDate = (ms: number | null): string => (ms ? scheduleDateFormat.format(ms) : "—");

/** "468", "468.5" or "1234,56" → minor units; null when it is not an amount. */
export function toCents(value: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;

  return Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
}
