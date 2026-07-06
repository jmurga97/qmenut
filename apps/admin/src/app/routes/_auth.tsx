import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminShell } from "@components/shell/admin-shell";
import { authClient } from "@lib/auth-client";

export const Route = createFileRoute("/_auth")({
  component: AdminShell,
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    if (!session) {
      redirect({ to: "/login", throw: true });
    }

    return { session };
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.trpc.admin.tenant.me.queryOptions());
  },
});
