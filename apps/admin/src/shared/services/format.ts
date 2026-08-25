export const formatNumber = (value: number): string => value.toLocaleString("es-ES");
export function formatPercent(value: number): string {
  return value.toLocaleString("es-ES", { style: "percent", maximumFractionDigits: 1 });
}
export function formatDate(value: number | null): string {
  return value === null ? "—" : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}
