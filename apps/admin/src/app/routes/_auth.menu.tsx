import { createFileRoute, Outlet } from "@tanstack/react-router";

import {
  getMenuAllergensQueryOptions,
  getMenuCategoriesQueryOptions,
  getMenuDishesQueryOptions,
  getMenuIngredientsQueryOptions,
  getMenuTagsQueryOptions,
} from "~/features/menu/api";
import { getSelectedBranch } from "~/shared/api";

export const Route = createFileRoute("/_auth/menu")({
  beforeLoad: async ({ context }) => {
    const branch = await getSelectedBranch(context);
    return { menuBranchId: branch?.id ?? null };
  },
  loader: async ({ context: { menuBranchId, queryClient, trpc } }) => {
    if (!menuBranchId) return;
    await Promise.all([
      queryClient.ensureQueryData(getMenuCategoriesQueryOptions({ branchId: menuBranchId, trpc })),
      queryClient.ensureQueryData(getMenuDishesQueryOptions({ branchId: menuBranchId, trpc })),
      queryClient.ensureQueryData(getMenuTagsQueryOptions({ trpc })),
      queryClient.ensureQueryData(getMenuAllergensQueryOptions({ trpc })),
      queryClient.ensureQueryData(getMenuIngredientsQueryOptions({ trpc })),
    ]);
  },
  component: () => <Outlet />,
});
