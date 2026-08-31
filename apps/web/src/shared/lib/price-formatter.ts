export function createPriceFormatter(locale: string, currency: string): (minorUnits: number) => string {
  let formatter: Intl.NumberFormat;

  try {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
  } catch {
    formatter = new Intl.NumberFormat("es-ES", { style: "currency", currency });
  }

  return (minorUnits: number) => formatter.format(minorUnits / 100);
}
