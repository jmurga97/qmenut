import { createFileRoute } from "@tanstack/react-router";

import { FidelityPage } from "~/features/fidelity/pages/fidelity-page";
import { ISR_CACHE_CONTROL } from "~/lib/isr";

export const Route = createFileRoute("/puntos")({
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  component: FidelityPage,
});
