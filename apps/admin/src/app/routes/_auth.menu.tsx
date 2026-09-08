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
      queryClient.query({ ...getMenuCategoriesQueryOptions({ branchId: menuBranchId, trpc }), staleTime: "static" }),
      queryClient.query({ ...getMenuDishesQueryOptions({ branchId: menuBranchId, trpc }), staleTime: "static" }),
      queryClient.query({ ...getMenuTagsQueryOptions({ trpc }), staleTime: "static" }),
      queryClient.query({ ...getMenuAllergensQueryOptions({ trpc }), staleTime: "static" }),
      queryClient.query({ ...getMenuIngredientsQueryOptions({ trpc }), staleTime: "static" }),
    ]);
  },
  component: () => <Outlet />,
});
