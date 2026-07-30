import { getErrorMessage } from "~/lib/errors";

import type { LoyaltyCustomer, LoyaltyVisitsPoint, VisitsPeriod } from "~/features/loyalty/types";

export const LOYALTY_POLL_INTERVAL_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
export function formatRelativeAge(createdAt: number, now: number): string {
  const elapsedSeconds = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (elapsedSeconds < 60) return `hace ${elapsedSeconds} s`;
  return `hace ${Math.floor(elapsedSeconds / 60)} min`;
}
export function formatCountdown(remainingMs: number): string {
  const seconds = Math.ceil(remainingMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function getValidationError(error: unknown): string {
  const message = getErrorMessage(error);
  return message.toLowerCase().includes("already validated")
    ? "La solicitud ya cambió en otro dispositivo. La lista se ha actualizado."
    : message;
}
export function getUndoError(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes("already undone")) {
    return "Esta validación ya se había deshecho. La información está actualizada.";
  }
  if (message.includes("balance would go negative")) {
    return "No se puede deshacer: el cliente ya ha utilizado parte de esos sellos.";
  }
  return "No se pudo deshacer la validación. Puedes volver a intentarlo.";
}
export function getVisitsRange(period: VisitsPeriod, now = Date.now()) {
  const date = new Date(now);
  const to = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return { from: to - (period === "30d" ? 30 : 365) * DAY_MS, to };
}
function getWeekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}
export function aggregateWeekly(points: LoyaltyVisitsPoint[]): LoyaltyVisitsPoint[] {
  const weeks = new Map<string, LoyaltyVisitsPoint>();
  for (const point of points) {
    const day = getWeekStart(point.day);
    const current = weeks.get(day) ?? { day, total: 0, newVisits: 0, returningVisits: 0 };
    current.total += point.total;
    current.newVisits += point.newVisits;
    current.returningVisits += point.returningVisits;
    weeks.set(day, current);
  }
  return weeks.values().toArray();
}
export function sumVisits(points: LoyaltyVisitsPoint[]) {
  return {
    newVisits: points.reduce((sum, point) => sum + point.newVisits, 0),
    returningVisits: points.reduce((sum, point) => sum + point.returningVisits, 0),
  };
}
export function sumReturn(points: Array<{ estimatedRevenue: number; rewardCost: number }>) {
  return {
    estimatedRevenue: points.reduce((sum, point) => sum + point.estimatedRevenue, 0),
    rewardCost: points.reduce((sum, point) => sum + point.rewardCost, 0),
  };
}
export const formatNumber = (value: number) => value.toLocaleString("es-ES");
export function formatPercent(value: number): string {
  return value.toLocaleString("es-ES", { style: "percent", maximumFractionDigits: 1 });
}
export function formatDate(value: number | null): string {
  return value === null ? "—" : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}
export function formatReturnRatio(ratio: number | null): string {
  return ratio === null ? "—" : `${ratio.toLocaleString("es-ES", { maximumFractionDigits: 1 })}×`;
}
function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function downloadCustomersCsv(rows: LoyaltyCustomer[]) {
  const headings = ["Email", "Sellos", "Visitas", "Primera visita", "Última visita", "Premios canjeados"];
  const lines = rows.map((row) =>
    [
      row.email,
      row.stampsBalance,
      row.totalVisits,
      formatDate(row.firstVisitAt),
      formatDate(row.lastVisitAt),
      row.rewardsRedeemed,
    ]
      .map((value) => escapeCsv(value))
      .join(","),
  );
  const csv = `${headings.map((heading) => escapeCsv(heading)).join(",")}\r\n${lines.join("\r\n")}`;
  const url = URL.createObjectURL(new Blob(["\u{FEFF}", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `clientes-fidelizacion-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
