import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { AdminShell } from "~/app/shell/admin-shell";
import { getListRestaurantsQueryOptions } from "~/features/auth/api";
import { authClient } from "~/lib/auth-client";
import { isForbiddenError } from "~/lib/errors";
import { trpcClient } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { useBranchStore } from "~/shared/stores/branch-store";

import type { AdminRouterContext } from "~/lib/trpc";

async function ensureTenantContext(context: AdminRouterContext) {
  try {
    return await context.queryClient.query({ ...getTenantQueryOptions({ trpc: context.trpc }), staleTime: "static" });
  } catch (error) {
    if (isForbiddenError(error)) {
      redirect({ to: "/select-restaurant", throw: true });
    }

    throw error;
  }
}

export const Route = createFileRoute("/_auth")({
  component: AdminShell,
  beforeLoad: async ({ context, location, preload }) => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      redirect({ to: "/login", throw: true });
    }
    const params = new URLSearchParams(location.searchStr);
    const branchId = params.get("branchId");
    const restaurantId = params.get("restaurantId");
    if (branchId && !preload) {
      if (restaurantId) {
        await trpcClient.auth.selectRestaurant.mutate({ restaurantId });
        context.queryClient.clear();
      }
      const targetTenant = await ensureTenantContext(context);
      if (!targetTenant.branches.some((branch) => branch.id === branchId)) notFound({ throw: true });
      useBranchStore.getState().setSelectedBranchId(branchId);
      // Consume the target once so later manual branch changes are not overridden by the URL.
      params.delete("branchId");
      params.delete("restaurantId");
      const query = params.toString();
      const hash = location.hash ? `#${encodeURIComponent(location.hash)}` : "";
      const queryString = query ? `?${query}` : "";
      redirect({ href: `${location.pathname}${queryString}${hash}`, replace: true, throw: true });
    }
    const tenant = await ensureTenantContext(context);
    return { session, roleCode: tenant.roleCode };
  },
  // The shell's restaurant selector suspends on this; start it alongside the child loaders instead of after the first render.
  loader: ({ context: { queryClient, trpc } }) => {
    void Promise.allSettled([queryClient.query({ ...getListRestaurantsQueryOptions({ trpc }), staleTime: "static" })]);
  },
});
