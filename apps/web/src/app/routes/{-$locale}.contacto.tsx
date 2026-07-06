import { createFileRoute } from "@tanstack/react-router";

import { ContactPage } from "~/features/contact/pages/contact-page";
import { ISR_CACHE_CONTROL } from "~/lib/isr";

export const Route = createFileRoute("/{-$locale}/contacto")({
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  component: ContactPage,
});
