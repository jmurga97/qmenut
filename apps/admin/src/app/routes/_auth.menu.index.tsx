import { createFileRoute } from "@tanstack/react-router";

import { MenuListPage } from "~/features/menu/pages/menu-pages";

export const Route = createFileRoute("/_auth/menu/")({
  component: MenuListPage,
});
