import { createFileRoute } from "@tanstack/react-router";

import {
  getMenuAllergensQueryOptions,
  getMenuIngredientsQueryOptions,
  getMenuTagsQueryOptions,
} from "~/features/menu/api";
import { MenuLayout } from "~/features/menu/pages/menu-pages";
import { getMenuCategoriesQueryOptions, getMenuDishesQueryOptions, getSelectedBranch } from "~/shared/api";

export const Route = createFileRoute("/_auth/menu")({
  beforeLoad: async ({ context }) => {
    const branch = await getSelectedBranch(context);
    return { menuBranchId: branch?.id ?? null };
  },
  loader: ({ context: { menuBranchId, queryClient, trpc } }) => {
    if (!menuBranchId) return;
    void Promise.allSettled([
      queryClient.query({ ...getMenuCategoriesQueryOptions({ branchId: menuBranchId, trpc }), staleTime: "static" }),
      queryClient.query({ ...getMenuDishesQueryOptions({ branchId: menuBranchId, trpc }), staleTime: "static" }),
      queryClient.query({ ...getMenuTagsQueryOptions({ trpc }), staleTime: "static" }),
      queryClient.query({ ...getMenuAllergensQueryOptions({ trpc }), staleTime: "static" }),
      queryClient.query({ ...getMenuIngredientsQueryOptions({ trpc }), staleTime: "static" }),
    ]);
  },
  component: MenuLayout,
});
