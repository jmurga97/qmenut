/**
 * PostHog cliente-only, sin cookies (persistencia en memoria → sin banner). Se carga con
 * import() dinámico tras la hidratación para no entrar en el bundle crítico. Los eventos
 * solo salen cuando el contexto del tenant está registrado; hasta entonces se encolan
 * conservando el instante real en que ocurrieron.
 */

import { createClientOnlyFn } from "@tanstack/react-start";

import { getAnalyticsVisitId, restaurantLocalDayHour } from "./visit";

import type { AnalyticsEventName, AnalyticsTenantContextInput, TrackArgs } from "./event-catalog";
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

/** Cola única para conservar el orden hasta tener contexto de tenant y SDK. */
const pendingEvents: PendingEvent[] = [];

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

interface CaptureInput {
  event: AnalyticsEventName;
  occurredAt: number;
  props: object | undefined;
}

function enqueue(bucket: PendingEvent[], event: PendingEvent): void {
  bucket.push(event);
}

function capture({ event, occurredAt, props }: CaptureInput): void {
  if (!state.instance) {
    enqueue(pendingEvents, { event, occurredAt, props });

    return;
  }

  const payload = { ...props, ...commonProperties(occurredAt) };

  state.instance.capture(event, payload, { timestamp: new Date(occurredAt) });
}

function flushPending(bucket: PendingEvent[]): void {
  const queued = [...bucket];

  bucket.length = 0;

  for (const event of queued) {
    capture(event);
  }
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

  if (state.tenantReady) {
    flushPending(pendingEvents);
  }
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
    flushPending(pendingEvents);
  }
}

export function track<E extends AnalyticsEventName>(event: E, ...args: TrackArgs<E>): void {
  if (!isEnabled()) {
    return;
  }

  const props = args[0];
  const occurredAt = Date.now();

  // Sin contexto del tenant el evento se retiene: sin restaurant_id/branch_id no es útil.
  if (!state.tenantReady || !state.instance) {
    enqueue(pendingEvents, { event, occurredAt, props });

    if (state.tenantReady) {
      void ensureLoaded();
    }

    return;
  }

  capture({ event, occurredAt, props });
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
