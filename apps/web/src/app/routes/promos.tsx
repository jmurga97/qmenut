import { createFileRoute } from "@tanstack/react-router";

import { ISR_CACHE_CONTROL } from "../lib/isr";

function PromosPage() {
  return null;
}

export const Route = createFileRoute("/promos")({
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  component: PromosPage,
});
