import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "~/lib/auth-client";
import { getTenantQueryOptions } from "~/shared/api";
import { AdminShell } from "~/shared/components/shell/admin-shell";

export const Route = createFileRoute("/_auth")({
  component: AdminShell,
  beforeLoad: async ({ context }) => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      redirect({ to: "/login", throw: true });
    }
    const tenant = await context.queryClient.ensureQueryData(getTenantQueryOptions({ trpc: context.trpc }));
    return { session, roleCode: tenant.roleCode };
  },
});
