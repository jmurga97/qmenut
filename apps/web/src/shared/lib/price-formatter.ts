export function createPriceFormatter(locale: string, currency: string): (minorUnits: number) => string {
  const formatter = createCurrencyFormatter(locale, currency);

  return (minorUnits: number) => formatter.format(minorUnits / 100);
}

function createCurrencyFormatter(locale: string, currency: string): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency });
  } catch {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency });
  }
}

function parseRate(rate: string): { coefficient: bigint; scale: number } | null {
  const parts = rate.split(".");

  if (parts.length > 2) {
    return null;
  }

  const [integerPart, fractionPart = ""] = parts;

  if (!/^\d+$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return null;
  }

  return {
    coefficient: BigInt(`${integerPart}${fractionPart}`),
    scale: fractionPart.length,
  };
}

export function isUsableVesExchangeRate(rate: string | null): rate is string {
  const parsedRate = rate === null ? null : parseRate(rate);

  return parsedRate !== null && parsedRate.scale <= 6 && parsedRate.coefficient > 0n;
}

function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const sign = numerator < 0n ? -1n : 1n;
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const rounded = (absoluteNumerator + denominator / 2n) / denominator;

  return rounded * sign;
}

/**
 * Formats USD minor units as VES minor units using fixed-point arithmetic. The final
 * conversion to Number is only for Intl display, after the exact two-decimal rounding.
 */
export function createVesPriceFormatter(locale: string, rate: string): ((minorUnits: number) => string) | null {
  const parsedRate = parseRate(rate);

  if (!isUsableVesExchangeRate(rate) || !parsedRate) {
    return null;
  }

  const formatter = createCurrencyFormatterWithTwoDecimals(locale, "VES");
  const denominator = 10n ** BigInt(parsedRate.scale);

  return (minorUnits: number) => {
    const vesMinorUnits = roundHalfUp(BigInt(minorUnits) * parsedRate.coefficient, denominator);

    return formatter.format(Number(vesMinorUnits) / 100);
  };
}

function createCurrencyFormatterWithTwoDecimals(locale: string, currency: string): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
