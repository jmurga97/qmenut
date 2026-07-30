import { createFileRoute } from "@tanstack/react-router";

import { getThemeQueryOptions } from "~/features/theme/api";
import { ThemePage } from "~/features/theme/pages/theme-page";
import { getSelectedBranch } from "~/shared/api";

export const Route = createFileRoute("/_auth/theme")({
  component: ThemePage,
  loader: async ({ context }) => {
    const branch = await getSelectedBranch(context);
    if (branch?.customDomain) {
      await context.queryClient.ensureQueryData(getThemeQueryOptions({ branchId: branch.id, trpc: context.trpc }));
    }
  },
});
