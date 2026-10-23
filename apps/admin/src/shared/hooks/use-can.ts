import { can } from "@qmenut/permissions";
import { useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions, isFeatureEnabled } from "~/shared/api";
import { useBranchStore } from "~/shared/stores/branch-store";

import type { Permission, PlanFeature } from "@qmenut/permissions";

export function useCan(permission: Permission): boolean {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  return can(tenant.roleCode, permission);
}

export function useFeature(feature: PlanFeature): boolean {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  return isFeatureEnabled({ branches: tenant.branches, selectedBranchId, feature });
}
