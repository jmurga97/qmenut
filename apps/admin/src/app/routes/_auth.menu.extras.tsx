import { createFileRoute } from "@tanstack/react-router";

import { MenuExtrasPage } from "~/features/menu/pages/extras-page";

export const Route = createFileRoute("/_auth/menu/extras")({
  component: MenuExtrasPage,
});
