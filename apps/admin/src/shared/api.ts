import { hasFeature, RESTAURANT_FEATURES } from "@qmenut/permissions";

import { resolveSelectedBranch, useBranchStore } from "~/shared/stores/branch-store";

import type { PlanCode, PlanFeature } from "@qmenut/permissions";
import type { AdminRouterContext, TrpcOptionsProxy } from "~/lib/trpc";

export function getLanguagesQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.languages.list.queryOptions();
}
interface BranchQueryInput {
  branchId: string;
  trpc: TrpcOptionsProxy;
}
export function getMenuCategoriesQueryOptions({ branchId, trpc }: BranchQueryInput) {
  return trpc.admin.menu.categories.list.queryOptions({ branchId });
}
export function getMenuDishesQueryOptions({ branchId, trpc }: BranchQueryInput) {
  return trpc.admin.menu.dishes.list.queryOptions({ branchId });
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

interface FeatureScope {
  branches: { id: string; planCode: PlanCode }[];
  selectedBranchId: string | null;
  feature: PlanFeature;
}

/** Mirrors the API's requireFeature: restaurant features use any branch, the rest the selected one. */
export function isFeatureEnabled({ branches, selectedBranchId, feature }: FeatureScope) {
  const scope = RESTAURANT_FEATURES.includes(feature)
    ? branches
    : [resolveSelectedBranch(branches, selectedBranchId)].filter((branch) => branch !== null);
  return hasFeature(
    scope.map((branch) => branch.planCode),
    feature,
  );
}

/** Loaders skip prefetching locked sections, so the API's refusal never surfaces as an error toast. */
export async function hasSelectedFeature(context: AdminRouterContext, feature: PlanFeature) {
  const tenant = await context.queryClient.query({ ...getTenantQueryOptions(context), staleTime: "static" });
  return isFeatureEnabled({
    branches: tenant.branches,
    selectedBranchId: useBranchStore.getState().selectedBranchId,
    feature,
  });
}
