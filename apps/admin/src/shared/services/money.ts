export function centsToEuros(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : String(cents / 100);
}
export function eurosToCents(euros: string): number {
  return Math.round(Number(euros) * 100);
}
export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", { currency, style: "currency" }).format(cents / 100);
}
