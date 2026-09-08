import { createFileRoute } from "@tanstack/react-router";

import { getBranchQueryOptions } from "~/features/branch/api";
import { BranchLayout } from "~/features/branch/pages/branch-layout";
import { getSelectedBranch } from "~/shared/api";

export const Route = createFileRoute("/_auth/branch")({
  component: BranchLayout,
  loader: async ({ context }) => {
    const branch = await getSelectedBranch(context);
    if (branch) {
      await context.queryClient.query({
        ...getBranchQueryOptions({ branchId: branch.id, trpc: context.trpc }),
        staleTime: "static",
      });
    }
  },
});
