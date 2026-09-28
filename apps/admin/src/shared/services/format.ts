import { i18n } from "~/lib/i18n";

const locale = () => i18n.resolvedLanguage ?? "es";

export const formatNumber = (value: number): string => value.toLocaleString(locale());
export function formatPercent(value: number): string {
  return value.toLocaleString(locale(), { style: "percent", maximumFractionDigits: 1 });
}
export function formatDate(value: number | null): string {
  return value === null
    ? "—"
    : new Intl.DateTimeFormat(locale(), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
