import { can } from "@qmenut/permissions";
import { createFileRoute } from "@tanstack/react-router";

import * as api from "~/features/dashboard/api";
import { DashboardPage } from "~/features/dashboard/pages/dashboard-page";
import { dashboardSearchSchema } from "~/features/dashboard/types";
import { getSelectedBranch } from "~/shared/api";
import { getVisitsRange } from "~/shared/services/visit-series";

import type { AdminRouterContext } from "~/lib/trpc";

function ensureTranslationsForActiveLanguages({
  branchId,
  queryClient,
  trpc,
}: AdminRouterContext & { branchId: string }) {
  async function run() {
    const languages = await queryClient.query({ ...api.getLanguagesQueryOptions({ trpc }), staleTime: "static" });
    const targets = languages.languages.filter(
      (language) => language.isActive && language.languageCode !== languages.defaultLanguageCode,
    );
    await Promise.all(
      targets.map((language) =>
        queryClient.query({
          ...api.getTranslationsQueryOptions({ branchId, languageCode: language.languageCode, trpc }),
          staleTime: "static",
        }),
      ),
    );
  }
  return run();
}

export const Route = createFileRoute("/_auth/")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const { queryClient, roleCode, trpc } = context;
    const jobs: Array<Promise<unknown>> = [];
    if (can(roleCode, "analytics.read")) {
      const range = getVisitsRange(deps.period);
      jobs.push(
        queryClient.query({ ...api.getAnalyticsSnapshotQueryOptions({ period: "15d", trpc }), staleTime: "static" }),
        queryClient.query({ ...api.getLoyaltySummaryQueryOptions({ trpc }), staleTime: "static" }),
        queryClient.query({ ...api.getLoyaltyVisitsQueryOptions({ ...range, trpc }), staleTime: "static" }),
      );
    }
    const branch = await getSelectedBranch(context);
    const tenant = await queryClient.query({ ...trpc.admin.tenant.me.queryOptions(), staleTime: "static" });
    if (tenant.restaurant.sourceCurrency === "USD" && can(roleCode, "exchangeRates.write")) {
      jobs.push(queryClient.query({ ...api.getExchangeRatesSummaryQueryOptions({ trpc }), staleTime: "static" }));
    }
    if (branch && can(roleCode, "loyalty.operate")) {
      jobs.push(
        queryClient.query({ ...api.getPendingRedemptionsQueryOptions({ trpc }), staleTime: "static" }),
        queryClient.query({ ...api.getVenueCodeQueryOptions({ branchId: branch.id, trpc }), staleTime: "static" }),
      );
    }
    if (branch) {
      jobs.push(
        queryClient.query({ ...api.getMenuCategoriesQueryOptions({ branchId: branch.id, trpc }), staleTime: "static" }),
        queryClient.query({ ...api.getMenuDishesQueryOptions({ branchId: branch.id, trpc }), staleTime: "static" }),
      );
    }
    if (can(roleCode, "branch.write")) {
      jobs.push(
        queryClient.query({ ...api.getLanguagesQueryOptions({ trpc }), staleTime: "static" }),
        queryClient.query({ ...api.getLanguageCatalogQueryOptions({ trpc }), staleTime: "static" }),
      );
      if (branch) jobs.push(ensureTranslationsForActiveLanguages({ ...context, branchId: branch.id }));
    }
    if (can(roleCode, "billing.manage")) {
      jobs.push(queryClient.query({ ...api.getBillingOverviewQueryOptions({ trpc }), staleTime: "static" }));
    }
    await Promise.all(jobs);
  },
  component: DashboardPage,
});
