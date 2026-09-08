import { useEffect, useRef } from "react";

import { track } from "~/lib/analytics/posthog";

import type { AnalyticsEventName, TrackArgs } from "~/lib/analytics/event-catalog";

/** Emite un evento del catálogo una sola vez al montar (guardado frente al doble mount de StrictMode). */
export function useTrackPageView<E extends AnalyticsEventName>(event: E, ...args: TrackArgs<E>): void {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) {
      return;
    }

    fired.current = true;
    track(event, ...args);
    // The ref guard, not an empty dep array, is what keeps this to one emission: suppressing
    // exhaustive-deps here made React Compiler skip optimizing the whole hook.
  }, [event, args]);
}
