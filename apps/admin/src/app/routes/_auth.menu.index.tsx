import { createFileRoute } from "@tanstack/react-router";

import { MenuListView } from "@pages/menu/menu-list-view";

export const Route = createFileRoute("/_auth/menu/")({
  component: MenuListView,
});
