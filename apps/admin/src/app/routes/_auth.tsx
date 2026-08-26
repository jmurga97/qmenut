import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "~/lib/auth-client";
import { isForbiddenError } from "~/lib/errors";
import { getTenantQueryOptions } from "~/shared/api";
import { AdminShell } from "~/shared/components/shell/admin-shell";

import type { AdminRouterContext } from "~/lib/trpc";

async function ensureTenantContext(context: AdminRouterContext) {
  try {
    return await context.queryClient.ensureQueryData(getTenantQueryOptions({ trpc: context.trpc }));
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
