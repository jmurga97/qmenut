import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import * as analyticsApi from "~/features/analytics/api";
import { AnalyticsPage } from "~/features/analytics/pages/analytics-page";
import { analyticsSearchSchema } from "~/features/analytics/types";

export const Route = createFileRoute("/_auth/analytics")({
  validateSearch: analyticsSearchSchema,
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "analytics.read")) redirect({ to: "/", throw: true });
  },
  loader: async ({ context: { queryClient, trpc }, deps }) => {
    await queryClient.ensureQueryData(analyticsApi.getAnalyticsSnapshotQueryOptions({ period: deps.period, trpc }));
  },
  component: AnalyticsPage,
});
