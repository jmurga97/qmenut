/**
 * PostHog cliente-only, sin cookies (persistencia en memoria → sin banner). Se carga con
 * import() dinámico tras la hidratación para no entrar en el bundle crítico. Los eventos
 * solo salen cuando el contexto del tenant está registrado; hasta entonces se encolan
 * conservando el instante real en que ocurrieron.
 */

import { createClientOnlyFn } from "@tanstack/react-start";

import type { AnalyticsEventName, AnalyticsEventPayloads, AnalyticsTenantContextInput, TrackArgs } from "./event-catalog";
import { getAnalyticsVisitId, restaurantLocalDayHour } from "./visit";
import type { PostHog } from "posthog-js";

interface PendingEvent {
  event: AnalyticsEventName;
  occurredAt: number;
  props: object | undefined;
}

const state: {
  instance: PostHog | null;
  loading: Promise<void> | null;
  superProps: Record<string, unknown> | null;
  tenantReady: boolean;
  timeZone: string | null;
} = { instance: null, loading: null, superProps: null, tenantReady: false, timeZone: null };

/** Eventos a la espera del contexto del tenant (restaurant_id, branch_id…). */
const pendingContext = new Map<number, PendingEvent>();
/** Contexto registrado pero SDK aún cargando. */
const pendingSdk = new Map<number, PendingEvent>();

let pendingSequence = 0;

function isEnabled(): boolean {
  return typeof window !== "undefined" && Boolean(import.meta.env.VITE_POSTHOG_KEY);
}

function commonProperties(occurredAt: number): Record<string, unknown> {
  const timeZone = state.timeZone;
  const localTime = timeZone ? restaurantLocalDayHour(occurredAt, timeZone) : null;

  return {
    analytics_visit_id: getAnalyticsVisitId(),
    ...(localTime && { analytics_day: localTime.day, analytics_hour: localTime.hour }),
  };
}

function capture(event: AnalyticsEventName, props: object | undefined, occurredAt: number): void {
  if (!state.instance) {
    pendingSdk.set(pendingSequence, { event, occurredAt, props });
    void ensureLoaded();

    return;
  }

  state.instance.capture(event, { ...props, ...commonProperties(occurredAt) }, { timestamp: new Date(occurredAt) });
}

function flushPending(bucket: Map<number, PendingEvent>): void {
  for (const queued of bucket.values()) {
    capture(queued.event, queued.props, queued.occurredAt);
  }

  bucket.clear();
}

const load = createClientOnlyFn(async (): Promise<void> => {
  const { default: posthog } = await import("posthog-js");

  posthog.init(import.meta.env.VITE_POSTHOG_KEY as string, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://eu.i.posthog.com",
    persistence: "memory",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    person_profiles: "identified_only",
  });

  state.instance = posthog;

  if (state.superProps) {
    state.instance.register(state.superProps);
  }

  flushPending(pendingContext);
  flushPending(pendingSdk);
});

async function ensureLoaded(): Promise<void> {
  if (!isEnabled() || state.loading) {
    return;
  }

  state.loading = load();

  try {
    await state.loading;
  } catch {
    state.loading = null;
  }
}

/**
 * Registra las dimensiones comunes del tenant y desbloquea el envío de eventos. Los
 * eventos encolados antes del registro se emiten con su instante original.
 */
export function registerTenantProperties(props: AnalyticsTenantContextInput): void {
  state.superProps = {
    ...state.superProps,
    branch_id: props.branchId,
    display_mode: props.displayMode,
    locale: props.locale,
    restaurant_id: props.restaurantId,
    tenant_host: props.tenantHost,
  };
  state.tenantReady = true;
  state.timeZone = props.timeZone ?? null;

  if (state.instance) {
    state.instance.register(state.superProps);
    flushPending(pendingContext);
  }
}

export function track<E extends AnalyticsEventName>(event: E, ...args: TrackArgs<E>): void {
  if (!isEnabled()) {
    return;
  }

  const props = args[0] as AnalyticsEventPayloads[E] | undefined;
  const occurredAt = Date.now();

  // Sin contexto del tenant el evento se retiene: sin restaurant_id/branch_id no es útil.
  if (!state.tenantReady || !state.instance) {
    pendingContext.set(pendingSequence, { event, occurredAt, props });
    void ensureLoaded();

    return;
  }

  capture(event, props, occurredAt);
}

/** Arranca la carga diferida cuando el hilo principal queda libre tras hidratar. */
export function scheduleAnalyticsLoad(): void {
  if (!isEnabled()) {
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => void ensureLoaded(), { timeout: 5000 });
  } else {
    setTimeout(() => void ensureLoaded(), 1500);
  }
}
