import { createFileRoute } from "@tanstack/react-router";

import { ThemePage } from "~/features/theme/pages/theme-page";
import { getSelectedBranch, getThemeQueryOptions } from "~/shared/api";

export const Route = createFileRoute("/_auth/theme")({
  component: ThemePage,
  loader: async ({ context }) => {
    const branch = await getSelectedBranch(context);
    if (branch?.customDomain) {
      await context.queryClient.query({
        ...getThemeQueryOptions({ branchId: branch.id, trpc: context.trpc }),
        staleTime: "static",
      });
    }
  },
});
