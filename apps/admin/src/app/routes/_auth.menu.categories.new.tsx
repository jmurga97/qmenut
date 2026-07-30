import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { CategoryEditorPage } from "~/features/menu/pages/menu-pages";

export const Route = createFileRoute("/_auth/menu/categories/new")({
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "menu.write")) redirect({ to: "/menu", throw: true });
  },
  component: () => <CategoryEditorPage />,
});
