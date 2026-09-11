import { AsYouType } from "libphonenumber-js";

import type { CountryCode } from "libphonenumber-js";

export function formatPhone(value: string, country: CountryCode = "ES"): string {
  return new AsYouType(country).input(value);
}
