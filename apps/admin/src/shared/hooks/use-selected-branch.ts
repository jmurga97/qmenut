import { useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { resolveSelectedBranch, useBranchStore } from "~/shared/stores/branch-store";

export function useSelectedBranch() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  return resolveSelectedBranch(tenant.branches, selectedBranchId);
}
