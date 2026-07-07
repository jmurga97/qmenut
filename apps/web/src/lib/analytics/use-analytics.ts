import { useEffect, useRef } from "react";

import { track } from "~/lib/analytics/posthog";

/** Emite un evento una sola vez al montar la página (guardado frente al doble mount de StrictMode). */
export function useTrackPageView(event: string, props?: Record<string, unknown>): void {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) {
      return;
    }

    fired.current = true;
    track(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);
}
