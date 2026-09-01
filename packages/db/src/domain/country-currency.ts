export const COUNTRY_CURRENCY_PAIRS = {
  ESP: "EUR",
  VEN: "USD",
} as const;

export function assertCountryCurrencyPair(countryCode: string, sourceCurrency: string): void {
  const expectedCurrency = COUNTRY_CURRENCY_PAIRS[countryCode as keyof typeof COUNTRY_CURRENCY_PAIRS];

  if (!expectedCurrency || expectedCurrency !== sourceCurrency) {
    throw new Error(
      `La pareja de país y moneda no es válida: ${countryCode}/${sourceCurrency}. ` +
        "Las parejas admitidas son ESP/EUR y VEN/USD.",
    );
  }
}
