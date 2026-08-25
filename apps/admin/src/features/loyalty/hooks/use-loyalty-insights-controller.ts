import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import * as api from "~/features/loyalty/api";
import * as services from "~/features/loyalty/services";
import { trpc } from "~/lib/trpc";
import { useDebouncedCallback } from "~/shared/hooks/use-debounced-callback";
import { aggregateWeekly, getVisitsRange, sumVisits } from "~/shared/services/visit-series";

import type * as Loyalty from "~/features/loyalty/types";

const insightsRoute = getRouteApi("/_auth/loyalty/insights");
const PAGE_SIZE = 25;
const CSV_PAGE_SIZE = 100;
export function useLoyaltyInsightsController() {
  const queryClient = useQueryClient();
  const navigate = insightsRoute.useNavigate();
  const search = insightsRoute.useSearch();
  const range = getVisitsRange(search.period);
  const { data: summary } = useSuspenseQuery(api.getLoyaltySummaryQueryOptions({ trpc }));
  const { data: loyaltyReturn } = useSuspenseQuery(api.getLoyaltyReturnQueryOptions({ trpc }));
  const { data: visits } = useSuspenseQuery(api.getLoyaltyVisitsQueryOptions({ ...range, trpc }));
  const { data: customers } = useSuspenseQuery(api.getLoyaltyCustomersQueryOptions({ search, trpc }));
  function updateSearch(patch: Partial<Loyalty.LoyaltyInsightsSearch>, replace = false) {
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace });
  }
  const setCustomerSearch = useDebouncedCallback((value: string) => {
    updateSearch({ search: value.trim(), page: 1 }, true);
  }, 300);
  function sortBy(column: Loyalty.CustomerSort) {
    if (search.sortBy === column) {
      updateSearch({ sortDir: search.sortDir === "asc" ? "desc" : "asc", page: 1 });
      return;
    }
    updateSearch({ sortBy: column, sortDir: column === "email" ? "asc" : "desc", page: 1 });
  }
  const exportMutation = useMutation({
    mutationFn: async () => {
      const rows: Loyalty.LoyaltyCustomer[] = [];
      let page = 1;
      let total: number;
      do {
        const result = await queryClient.fetchQuery(
          api.getLoyaltyCustomersQueryOptions({
            search,
            page,
            pageSize: CSV_PAGE_SIZE,
            trpc,
          }),
        );
        rows.push(...result.rows);
        total = result.total;
        page += 1;
        if (result.rows.length < CSV_PAGE_SIZE) break;
      } while (rows.length < total);
      services.downloadCustomersCsv(rows);
    },
  });
  const visitsPoints = search.period === "12m" ? aggregateWeekly(visits) : visits;
  const visitsTotals = sumVisits(visitsPoints);
  const returnTotals = services.sumReturn(loyaltyReturn.points);
  return {
    customers,
    exportError: exportMutation.error,
    exporting: exportMutation.isPending,
    loyaltyReturn,
    returnRatio: returnTotals.rewardCost > 0 ? returnTotals.estimatedRevenue / returnTotals.rewardCost : null,
    returnTotals,
    search,
    summary,
    totalPages: Math.max(1, Math.ceil(customers.total / PAGE_SIZE)),
    visitsPoints,
    visitsTotals,
    exportCustomers: exportMutation.mutate,
    setCustomerSearch,
    setInactive: (inactive: boolean) => updateSearch({ inactive, page: 1 }),
    setPage: (page: number) => updateSearch({ page }),
    setPeriod: (period: Loyalty.LoyaltyInsightsSearch["period"]) => updateSearch({ period }),
    sortBy,
  };
}
