import { createFileRoute, Outlet } from "@tanstack/react-router";

import { getMenuCategoriesQueryOptions, getMenuDishesQueryOptions } from "~/features/menu/api";
import { getPromotionsQueryOptions } from "~/features/promotions/api";
import { getSelectedBranch } from "~/shared/api";

export const Route = createFileRoute("/_auth/promotions")({
  beforeLoad: async ({ context }) => {
    const branch = await getSelectedBranch(context);
    return { promotionsBranchId: branch?.id ?? null };
  },
  loader: async ({ context: { promotionsBranchId, queryClient, trpc } }) => {
    if (!promotionsBranchId) return;
    await Promise.all([
      queryClient.ensureQueryData(getPromotionsQueryOptions({ branchId: promotionsBranchId, trpc })),
      queryClient.ensureQueryData(getMenuCategoriesQueryOptions({ branchId: promotionsBranchId, trpc })),
      queryClient.ensureQueryData(getMenuDishesQueryOptions({ branchId: promotionsBranchId, trpc })),
    ]);
  },
  component: () => <Outlet />,
});
