/**
 * Estado efímero por carga del documento: la visita de analítica vive solo en memoria,
 * sin persistencia ni identificación del visitante. También centraliza el cálculo de
 * analytics_day/analytics_hour en la zona horaria del restaurante.
 */

function createVisitId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `visit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const visitId = createVisitId();

const dayFormatters = new Map<string, Intl.DateTimeFormat>();
const hourFormatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dayFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    });
    dayFormatters.set(timeZone, formatter);
  }

  return formatter;
}

function hourFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = hourFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone });
    hourFormatters.set(timeZone, formatter);
  }

  return formatter;
}

export interface RestaurantLocalTime {
  /** Día local del restaurante como YYYY-MM-DD (respeta DST vía Intl). */
  day: string;
  /** Hora local 0-23. */
  hour: number;
}

export function restaurantLocalDayHour(timestampMs: number, timeZone: string): RestaurantLocalTime | null {
  try {
    const day = dayFormatter(timeZone).format(timestampMs);
    const hour = Number(hourFormatter(timeZone).format(timestampMs));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(hour) || hour < 0 || hour > 23) {
      return null;
    }

    return { day, hour };
  } catch {
    return null;
  }
}

/** Ejecuta `fn` una sola vez por carga del documento bajo `key` (p. ej. ttfb de menu_view). */
export function runOncePerVisit<T>(key: string, fn: () => T): T | undefined {
  if (oncePerVisitKeys.has(key)) {
    return undefined;
  }

  oncePerVisitKeys.add(key);

  return fn();
}

const oncePerVisitKeys = new Set<string>();

export function getAnalyticsVisitId(): string {
  return visitId;
}
