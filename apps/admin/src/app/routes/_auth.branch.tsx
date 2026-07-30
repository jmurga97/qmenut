import { createFileRoute } from "@tanstack/react-router";

import { getBranchQueryOptions } from "~/features/branch/api";
import { BranchPage } from "~/features/branch/pages/branch-page";
import { getSelectedBranch } from "~/shared/api";

export const Route = createFileRoute("/_auth/branch")({
  component: BranchPage,
  loader: async ({ context }) => {
    const branch = await getSelectedBranch(context);
    if (branch) {
      await context.queryClient.ensureQueryData(getBranchQueryOptions({ branchId: branch.id, trpc: context.trpc }));
    }
  },
});
