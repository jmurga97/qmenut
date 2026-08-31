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
    const languages = await queryClient.ensureQueryData(api.getLanguagesQueryOptions({ trpc }));
    const targets = languages.languages.filter(
      (language) => language.isActive && language.languageCode !== languages.defaultLanguageCode,
    );
    await Promise.all(
      targets.map((language) =>
        queryClient.ensureQueryData(
          api.getTranslationsQueryOptions({ branchId, languageCode: language.languageCode, trpc }),
        ),
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
    if (can(roleCode, "loyalty.insights")) {
      const range = getVisitsRange(deps.period);
      jobs.push(
        queryClient.ensureQueryData(api.getAnalyticsSnapshotQueryOptions({ period: "15d", trpc })),
        queryClient.ensureQueryData(api.getLoyaltySummaryQueryOptions({ trpc })),
        queryClient.ensureQueryData(api.getLoyaltyVisitsQueryOptions({ ...range, trpc })),
      );
    }
    const branch = await getSelectedBranch(context);
    const tenant = await queryClient.ensureQueryData(trpc.admin.tenant.me.queryOptions());
    if (tenant.restaurant.sourceCurrency === "USD" && can(roleCode, "exchangeRates.write")) {
      jobs.push(queryClient.ensureQueryData(api.getExchangeRatesSummaryQueryOptions({ trpc })));
    }
    if (branch && can(roleCode, "loyalty.operate")) {
      jobs.push(
        queryClient.ensureQueryData(api.getPendingRedemptionsQueryOptions({ trpc })),
        queryClient.ensureQueryData(api.getVenueCodeQueryOptions({ branchId: branch.id, trpc })),
      );
    }
    if (branch) {
      jobs.push(
        queryClient.ensureQueryData(api.getMenuCategoriesQueryOptions({ branchId: branch.id, trpc })),
        queryClient.ensureQueryData(api.getMenuDishesQueryOptions({ branchId: branch.id, trpc })),
      );
    }
    if (can(roleCode, "branch.write")) {
      jobs.push(
        queryClient.ensureQueryData(api.getLanguagesQueryOptions({ trpc })),
        queryClient.ensureQueryData(api.getLanguageCatalogQueryOptions({ trpc })),
      );
      if (branch) jobs.push(ensureTranslationsForActiveLanguages({ ...context, branchId: branch.id }));
    }
    if (can(roleCode, "billing.manage")) {
      jobs.push(queryClient.ensureQueryData(api.getBillingOverviewQueryOptions({ trpc })));
    }
    await Promise.all(jobs);
  },
  component: DashboardPage,
});
