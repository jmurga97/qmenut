/**
 * PostHog cliente-only, sin cookies (persistencia en memoria → sin banner). Se carga con
 * import() dinámico tras la hidratación para no entrar en el bundle crítico; los eventos
 * emitidos antes de que cargue se encolan y se envían al inicializarse.
 */

import type { PostHog } from "posthog-js";

type QueuedEvent = { event: string; props?: Record<string, unknown> };

let instance: PostHog | null = null;
let loading: Promise<void> | null = null;
let superProps: Record<string, unknown> | null = null;
const queue: QueuedEvent[] = [];

function isEnabled(): boolean {
  return typeof window !== "undefined" && Boolean(import.meta.env.VITE_POSTHOG_KEY);
}

async function load(): Promise<void> {
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

  instance = posthog;

  if (superProps) {
    instance.register(superProps);
  }

  for (const queued of queue.splice(0)) {
    instance.capture(queued.event, queued.props);
  }
}

function ensureLoaded(): void {
  if (!isEnabled() || loading) {
    return;
  }

  loading = load().catch(() => {
    loading = null;
  });
}

/** Propiedades adjuntas a todos los eventos (restaurant_id, branch_id, tenant_host). */
export function registerTenantProperties(props: Record<string, unknown>): void {
  superProps = { ...superProps, ...props };
  instance?.register(props);
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!isEnabled()) {
    return;
  }

  if (instance) {
    instance.capture(event, props);
    return;
  }

  queue.push({ event, props });
  ensureLoaded();
}

/** Arranca la carga diferida cuando el hilo principal queda libre tras hidratar. */
export function scheduleAnalyticsLoad(): void {
  if (!isEnabled()) {
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => ensureLoaded(), { timeout: 5000 });
  } else {
    setTimeout(() => ensureLoaded(), 1500);
  }
}
