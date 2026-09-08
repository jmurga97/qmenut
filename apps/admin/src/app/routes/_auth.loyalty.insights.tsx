import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import * as loyaltyApi from "~/features/loyalty/api";
import { LoyaltyInsightsPage } from "~/features/loyalty/pages/loyalty-insights-page";
import { loyaltyInsightsSearchSchema } from "~/features/loyalty/types";
import { getVisitsRange } from "~/shared/services/visit-series";

export const Route = createFileRoute("/_auth/loyalty/insights")({
  validateSearch: loyaltyInsightsSearchSchema,
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "loyalty.insights")) redirect({ to: "/loyalty", throw: true });
  },
  loader: async ({ context: { queryClient, trpc }, deps }) => {
    const range = getVisitsRange(deps.period);
    await Promise.all([
      queryClient.query({ ...loyaltyApi.getLoyaltySummaryQueryOptions({ trpc }), staleTime: "static" }),
      queryClient.query({ ...loyaltyApi.getLoyaltyVisitsQueryOptions({ ...range, trpc }), staleTime: "static" }),
      queryClient.query({ ...loyaltyApi.getLoyaltyCustomersQueryOptions({ search: deps, trpc }), staleTime: "static" }),
    ]);
  },
  component: LoyaltyInsightsPage,
});
