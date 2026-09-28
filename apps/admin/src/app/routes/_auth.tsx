import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminShell } from "~/app/shell/admin-shell";
import { getListRestaurantsQueryOptions } from "~/features/auth/api";
import { getLanguageCatalogQueryOptions } from "~/features/languages/api";
import { authClient } from "~/lib/auth-client";
import { isForbiddenError } from "~/lib/errors";
import { getLanguagesQueryOptions, getTenantQueryOptions } from "~/shared/api";

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
  beforeLoad: async ({ context }) => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      redirect({ to: "/login", throw: true });
    }
    const tenant = await ensureTenantContext(context);
    return { session, roleCode: tenant.roleCode };
  },
  // The shell's selectors suspend on these; start them alongside the child loaders instead of after the first render.
  loader: ({ context: { queryClient, trpc } }) => {
    void Promise.allSettled([
      queryClient.query({ ...getListRestaurantsQueryOptions({ trpc }), staleTime: "static" }),
      queryClient.query({ ...getLanguageCatalogQueryOptions({ trpc }), staleTime: "static" }),
      queryClient.query({ ...getLanguagesQueryOptions({ trpc }), staleTime: "static" }),
    ]);
  },
});
