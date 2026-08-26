export interface VisitSeriesPoint {
  day: string;
  total: number;
  newVisits: number;
  returningVisits: number;
}

export const VISIT_PERIODS = ["30d", "12m"] as const;

export type VisitsPeriod = (typeof VISIT_PERIODS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export function getVisitsRange(period: VisitsPeriod, now = Date.now()): { from: number; to: number } {
  const date = new Date(now);
  const to = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return { from: to - (period === "30d" ? 30 : 365) * DAY_MS, to };
}

function getWeekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

export function aggregateWeekly(points: VisitSeriesPoint[]): VisitSeriesPoint[] {
  const weeks = new Map<string, VisitSeriesPoint>();
  for (const point of points) {
    const day = getWeekStart(point.day);
    const current = weeks.get(day) ?? { day, newVisits: 0, returningVisits: 0, total: 0 };
    current.total += point.total;
    current.newVisits += point.newVisits;
    current.returningVisits += point.returningVisits;
    weeks.set(day, current);
  }
  return weeks.values().toArray();
}

export function sumVisits(points: VisitSeriesPoint[]): { newVisits: number; returningVisits: number } {
  return {
    newVisits: points.reduce((sum, point) => sum + point.newVisits, 0),
    returningVisits: points.reduce((sum, point) => sum + point.returningVisits, 0),
  };
}

export function formatDayLabel(day: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}
