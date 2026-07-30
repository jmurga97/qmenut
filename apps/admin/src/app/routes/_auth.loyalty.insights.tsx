import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import * as loyaltyApi from "~/features/loyalty/api";
import { LoyaltyInsightsPage } from "~/features/loyalty/pages/loyalty-insights-page";
import { getVisitsRange } from "~/features/loyalty/services";
import { loyaltyInsightsSearchSchema } from "~/features/loyalty/types";

export const Route = createFileRoute("/_auth/loyalty/insights")({
  validateSearch: loyaltyInsightsSearchSchema,
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "loyalty.insights")) redirect({ to: "/loyalty", throw: true });
  },
  loader: async ({ context: { queryClient, trpc }, deps }) => {
    const range = getVisitsRange(deps.period);
    await Promise.all([
      queryClient.ensureQueryData(loyaltyApi.getLoyaltySummaryQueryOptions({ trpc })),
      queryClient.ensureQueryData(loyaltyApi.getLoyaltyReturnQueryOptions({ trpc })),
      queryClient.ensureQueryData(loyaltyApi.getLoyaltyVisitsQueryOptions({ ...range, trpc })),
      queryClient.ensureQueryData(loyaltyApi.getLoyaltyCustomersQueryOptions({ search: deps, trpc })),
    ]);
  },
  component: LoyaltyInsightsPage,
});
