/** Spain and Venezuela are the only countries a restaurant can have today (COUNTRY_CURRENCY_PAIRS). */
const CALLING_CODES: Record<string, string> = { ESP: "+34", VEN: "+58" };

export function getDefaultPhonePrefix(countryCode: string): string {
  return CALLING_CODES[countryCode] ?? "+34";
}

/**
 * The guest's phone in E.164, or null. A number typed with its own + or 00 prefix wins over the prefix field;
 * a national trunk 0 (Venezuela's 0412…) is dropped.
 */
export function toE164({ prefix, number }: { prefix: string; number: string }): string | null {
  const digits = number.replaceAll(/[^\d+]/g, "");
  let phone = `${prefix.replaceAll(/[^\d+]/g, "")}${digits.replace(/^0+/, "")}`;

  if (digits.startsWith("+")) phone = digits;
  else if (digits.startsWith("00")) phone = `+${digits.slice(2)}`;

  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

/** A loose check before the server's: one @, no spaces, a dot in the domain. */
export function isEmail(value: string): boolean {
  const email = value.trim();
  const at = email.indexOf("@");
  const domain = email.slice(at + 1);

  return at > 0 && !email.includes(" ") && !domain.includes("@") && domain.includes(".") && !domain.endsWith(".");
}

/** Local dates and slot minutes are already in the restaurant's time: format them in UTC so nothing shifts. */
export function formatSlotDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export function formatSlotTime(minute: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, 0, 1, 0, minute)),
  );
}
