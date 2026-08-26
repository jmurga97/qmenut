/**
 * Calendario del digest quincenal. Los periodos son de 15 días completos (no días 1 y 16
 * del calendario) y nunca se solapan: el ancla guarda el último día cerrado enviado y el
 * siguiente periodo empieza al día siguiente. Las entregas idempotentes se crean antes de
 * avanzar el ancla, y sus leases evitan que dos ejecuciones concurrentes envíen a la vez.
 */

const DIGEST_PERIOD_DAYS = 15;

export interface DigestPeriod {
  endDay: string;
  startDay: string;
}

export function toUtcDay(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86_400_000).toISOString().slice(0, 10);
}

/** Último día completo: ayer en UTC (todos los tenants operan en Europa/Madrid o cercano). */
export function lastCompleteDay(nowMs: number): string {
  return addDays(toUtcDay(nowMs), -1);
}

export function nextPendingPeriod(anchorEndDay: string | null, completedUpTo: string): DigestPeriod | null {
  if (anchorEndDay === null) {
    // Primera ejecución: los últimos 15 días completos.
    return { endDay: completedUpTo, startDay: addDays(completedUpTo, -(DIGEST_PERIOD_DAYS - 1)) };
  }

  const endDay = addDays(anchorEndDay, DIGEST_PERIOD_DAYS);

  if (endDay > completedUpTo) {
    return null;
  }

  return { endDay, startDay: addDays(anchorEndDay, 1) };
}
