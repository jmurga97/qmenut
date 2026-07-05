import { createFileRoute } from "@tanstack/react-router";

import { MenuPage } from "~/features/menu/pages/menu-page";
import { ISR_CACHE_CONTROL } from "~/lib/isr";

export const Route = createFileRoute("/")({
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  component: MenuPage,
});
