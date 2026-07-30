import { useSuspenseQuery } from "@tanstack/react-query";

import { resolveSelectedBranch, useBranchStore } from "~/app/store/branch-store";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";

export function useSelectedBranch() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  return resolveSelectedBranch(tenant.branches, selectedBranchId);
}
