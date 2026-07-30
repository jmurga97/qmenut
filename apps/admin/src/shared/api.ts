import { resolveSelectedBranch, useBranchStore } from "~/app/store/branch-store";

import type { AdminRouterContext, TrpcOptionsProxy } from "~/lib/trpc";

export function getTenantQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.tenant.me.queryOptions();
}
export async function getSelectedBranch({ queryClient, trpc }: AdminRouterContext) {
  const tenant = await queryClient.ensureQueryData(getTenantQueryOptions({ trpc }));
  return resolveSelectedBranch(tenant.branches, useBranchStore.getState().selectedBranchId);
}
