import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { DishEditorPage } from "~/features/menu/pages/menu-pages";

export const Route = createFileRoute("/_auth/menu/dishes/new")({
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "menu.write")) redirect({ to: "/menu", throw: true });
  },
  component: () => <DishEditorPage />,
});
