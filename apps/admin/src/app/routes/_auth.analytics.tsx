import { can } from "@qmenut/permissions";
import { noop } from "@tanstack/react-query";
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
  loader: ({ context: { queryClient, trpc }, deps }) => {
    void queryClient
      .query({ ...analyticsApi.getAnalyticsSnapshotQueryOptions({ period: deps.period, trpc }), staleTime: "static" })
      .catch(noop);
  },
  component: AnalyticsPage,
});
