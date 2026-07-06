import { useSuspenseQuery } from "@tanstack/react-query";

import { resolveSelectedBranch, useBranchStore } from "@app/store/branch-store";
import { trpc } from "@lib/trpc";

import type { AdminBranch } from "@lib/api-types";

/**
 * Sucursal activa del panel: combina el tenant (fuente de verdad de sucursales)
 * con la selección persistida en el store.
 */
export function useSelectedBranch(): AdminBranch | null {
  const { data: tenant } = useSuspenseQuery(trpc.admin.tenant.me.queryOptions());
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);

  return resolveSelectedBranch(tenant.branches, selectedBranchId);
}
