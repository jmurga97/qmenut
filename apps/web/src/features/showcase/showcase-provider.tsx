import { parseShowcaseMessage, SHOWCASE_READY } from "@qmenut/ui/theme/showcase";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { activateShowcase, withAllFeatures } from "~/features/showcase/showcase-link";
import { ShowcaseContext } from "~/features/showcase/use-showcase-step";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";

import type { ShowcaseStep } from "@qmenut/ui/theme/showcase";
import type { ReactNode } from "react";

/** Mounted only with `?showcase=landing`; nothing changes until the landing, as the parent frame, says hello. */
export function ShowcaseProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<ShowcaseStep | null>(null);
  const queryClient = useQueryClient();
  const trpc = useAppTrpc();

  useEffect(() => {
    if (window.parent === window) return;
    const localPreview = import.meta.env.DEV || window.location.hostname.endsWith(".dev.qmenut.app");
    const origins = localPreview
      ? ["https://qmenut.app", "https://landing.dev.qmenut.app", "http://localhost:4321", "http://127.0.0.1:4321"]
      : ["https://qmenut.app"];
    let active = true;

    function receive(event: MessageEvent<unknown>) {
      if (!origins.includes(event.origin) || !Object.is(event.source, window.parent)) return;
      const next = parseShowcaseMessage(event.data);
      if (!next) return;
      activateShowcase();
      // The menu came with the server render, before the link could touch it.
      queryClient.setQueriesData({ queryKey: trpc.menu.publicData.pathKey() }, withAllFeatures);
      document.documentElement.dataset.showcaseStep = next;
      setStep(next);
    }

    window.addEventListener("message", receive);
    void document.fonts.ready.then(() => {
      if (!active) return;
      for (const origin of origins) window.parent.postMessage({ type: SHOWCASE_READY }, origin);
    });
    return () => {
      active = false;
      window.removeEventListener("message", receive);
    };
  }, [queryClient, trpc]);

  return <ShowcaseContext.Provider value={step}>{children}</ShowcaseContext.Provider>;
}
