/**
 * PostHog cliente-only, sin cookies (persistencia en memoria → sin banner). Se carga con
 * import() dinámico tras la hidratación para no entrar en el bundle crítico; los eventos
 * emitidos antes de que cargue se encolan y se envían al inicializarse.
 */

import { createClientOnlyFn } from "@tanstack/react-start";

import type { PostHog } from "posthog-js";

type QueuedEvent = { event: string; props?: Record<string, unknown> };

const state: {
  instance: PostHog | null;
  loading: Promise<void> | null;
  superProps: Record<string, unknown> | null;
} = { instance: null, loading: null, superProps: null };
const queue: QueuedEvent[] = [];

function isEnabled(): boolean {
  return typeof window !== "undefined" && Boolean(import.meta.env.VITE_POSTHOG_KEY);
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

  for (const queued of queue) {
    state.instance.capture(queued.event, queued.props);
  }

  queue.length = 0;
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

/** Propiedades adjuntas a todos los eventos (restaurant_id, branch_id, tenant_host). */
export function registerTenantProperties(props: Record<string, unknown>): void {
  state.superProps = { ...state.superProps, ...props };
  state.instance?.register(props);
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!isEnabled()) {
    return;
  }

  if (state.instance) {
    state.instance.capture(event, props);
    return;
  }

  queue.push({ event, props });
  void ensureLoaded();
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
