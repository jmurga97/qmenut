export function isUsableRestaurantExchangeRate(rate: string | null): rate is string {
  if (rate === null) {
    return false;
  }

  const parts = rate.split(".");

  if (parts.length > 2) {
    return false;
  }

  const [integerPart, fractionPart = ""] = parts;

  if (!/^\d+$/.test(integerPart) || !/^\d*$/.test(fractionPart) || fractionPart.length > 6) {
    return false;
  }

  return /[1-9]/.test(`${integerPart}${fractionPart}`);
}
