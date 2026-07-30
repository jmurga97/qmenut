import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { PromotionEditorPage } from "~/features/promotions/pages/promotion-pages";

export const Route = createFileRoute("/_auth/promotions/new")({
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "promotions.write")) redirect({ to: "/promotions", throw: true });
  },
  component: () => <PromotionEditorPage />,
});
