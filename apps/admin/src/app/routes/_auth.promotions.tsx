import { createFileRoute, Outlet } from "@tanstack/react-router";

import { getPromotionsQueryOptions } from "~/features/promotions/api";
import { getMenuCategoriesQueryOptions, getMenuDishesQueryOptions, getSelectedBranch } from "~/shared/api";

export const Route = createFileRoute("/_auth/promotions")({
  beforeLoad: async ({ context }) => {
    const branch = await getSelectedBranch(context);
    return { promotionsBranchId: branch?.id ?? null };
  },
  loader: ({ context: { promotionsBranchId, queryClient, trpc } }) => {
    if (!promotionsBranchId) return;
    void Promise.allSettled([
      queryClient.query({ ...getPromotionsQueryOptions({ branchId: promotionsBranchId, trpc }), staleTime: "static" }),
      queryClient.query({
        ...getMenuCategoriesQueryOptions({ branchId: promotionsBranchId, trpc }),
        staleTime: "static",
      }),
      queryClient.query({ ...getMenuDishesQueryOptions({ branchId: promotionsBranchId, trpc }), staleTime: "static" }),
    ]);
  },
  component: () => <Outlet />,
});
