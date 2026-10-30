/** Restaurant-local time with Intl only: no timezone database ships with the Worker beyond what Intl knows. */

const ISO_DAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

const MINUTE_MS = 60_000;

function getParts({ nowMs, timeZone }: { nowMs: number; timeZone: string }) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(nowMs));
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    // en-US renders midnight as 24 with hour12 off.
    hour: Number(getPart("hour")) % 24,
    minute: Number(getPart("minute")),
    weekday: getPart("weekday"),
  };
}

export function getLocalDayAndMinute({ nowMs, timeZone }: { nowMs: number; timeZone: string }): {
  /** Local YYYY-MM-DD. */
  date: string;
  isoDay: number;
  minute: number;
} {
  const parts = getParts({ nowMs, timeZone });

  return {
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    isoDay: ISO_DAY[parts.weekday] ?? 1,
    minute: parts.hour * 60 + parts.minute,
  };
}

/** How far the zone is ahead of UTC at that instant, in milliseconds. */
function getOffsetMs({ nowMs, timeZone }: { nowMs: number; timeZone: string }): number {
  const parts = getParts({ nowMs, timeZone });
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);

  return asUtc - Math.floor(nowMs / MINUTE_MS) * MINUTE_MS;
}

/** Local date and minute after midnight to UTC milliseconds. A time skipped by a DST jump lands an hour later. */
export function localToUtc({ date, minute, timeZone }: { date: string; minute: number; timeZone: string }): number {
  const [year, month, day] = date.split("-").map(Number);
  const asUtc = Date.UTC(year, month - 1, day, 0, minute);
  const guess = asUtc - getOffsetMs({ nowMs: asUtc, timeZone });

  // The offset at the guess is the right one unless a DST change sits between the two instants.
  return asUtc - getOffsetMs({ nowMs: guess, timeZone });
}

/** Calendar arithmetic on local YYYY-MM-DD dates. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** 0 is Sunday, as in Date#getDay and reservation_slots.weekday. */
export function getWeekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
