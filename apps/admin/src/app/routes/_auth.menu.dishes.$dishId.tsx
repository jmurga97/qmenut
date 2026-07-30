import { createFileRoute } from "@tanstack/react-router";

import { getDishDetailQueryOptions } from "~/features/menu/api";
import { DishEditorPage } from "~/features/menu/pages/menu-pages";

export const Route = createFileRoute("/_auth/menu/dishes/$dishId")({
  loader: async ({ context, params }) => {
    if (!context.menuBranchId) return;
    await context.queryClient.ensureQueryData(getDishDetailQueryOptions({ dishId: params.dishId, trpc: context.trpc }));
  },
  component: function DishRoute() {
    return <DishEditorPage dishId={Route.useParams().dishId} />;
  },
});
