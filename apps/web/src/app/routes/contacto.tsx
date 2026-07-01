import { createFileRoute } from "@tanstack/react-router";

import { ISR_CACHE_CONTROL } from "../lib/isr";

function ContactoPage() {
  return null;
}

export const Route = createFileRoute("/contacto")({
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  component: ContactoPage,
});
