import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { getBillingOverviewQueryOptions } from "~/features/billing/api";
import { BillingPage } from "~/features/billing/pages/billing-page";

export const Route = createFileRoute("/_auth/billing")({
  component: BillingPage,
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "billing.manage")) redirect({ to: "/", throw: true });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(getBillingOverviewQueryOptions({ trpc: context.trpc })),
});
