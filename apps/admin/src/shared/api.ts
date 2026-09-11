import { resolveSelectedBranch, useBranchStore } from "~/shared/stores/branch-store";

import type { AdminRouterContext, TrpcOptionsProxy } from "~/lib/trpc";

export function getLanguagesQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.languages.list.queryOptions();
}
interface BranchQueryInput {
  branchId: string;
  languageCode?: string | null;
  trpc: TrpcOptionsProxy;
}
export function getMenuCategoriesQueryOptions({ branchId, languageCode, trpc }: BranchQueryInput) {
  return trpc.admin.menu.categories.list.queryOptions({ branchId, languageCode: languageCode ?? undefined });
}
export function getMenuDishesQueryOptions({ branchId, languageCode, trpc }: BranchQueryInput) {
  return trpc.admin.menu.dishes.list.queryOptions({ branchId, languageCode: languageCode ?? undefined });
}
export function getThemeQueryOptions({ branchId, trpc }: { branchId: string; trpc: TrpcOptionsProxy }) {
  return trpc.admin.theme.get.queryOptions({ branchId });
}
export function getTenantQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.tenant.me.queryOptions();
}
export async function getSelectedBranch({ queryClient, trpc }: AdminRouterContext) {
  const tenant = await queryClient.query({ ...getTenantQueryOptions({ trpc }), staleTime: "static" });
  return resolveSelectedBranch(tenant.branches, useBranchStore.getState().selectedBranchId);
}
