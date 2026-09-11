import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminShell } from "~/app/shell/admin-shell";
import { authClient } from "~/lib/auth-client";
import { isForbiddenError } from "~/lib/errors";
import { getTenantQueryOptions } from "~/shared/api";

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
});
