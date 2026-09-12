import { formatDate } from "~/shared/services/format";

import type { LoyaltyCustomer } from "~/features/loyalty/types";

export const LOYALTY_POLL_INTERVAL_MS = 5000;
export function formatRelativeAge(createdAt: number, now: number): string {
  const elapsedSeconds = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (elapsedSeconds < 60) return `hace ${elapsedSeconds} s`;
  return `hace ${Math.floor(elapsedSeconds / 60)} min`;
}
export function formatCountdown(remainingMs: number): string {
  const seconds = Math.ceil(remainingMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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
