import { createFileRoute } from "@tanstack/react-router";

import { PromosPage } from "~/features/promos/pages/promos-page";
import { ISR_CACHE_CONTROL } from "~/lib/isr";

export const Route = createFileRoute("/{-$locale}/promos")({
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  component: PromosPage,
});
