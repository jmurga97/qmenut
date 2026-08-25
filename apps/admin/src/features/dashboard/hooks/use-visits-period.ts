import { getRouteApi } from "@tanstack/react-router";

import type { DashboardSearch } from "~/features/dashboard/types";

const indexRoute = getRouteApi("/_auth/");

/** The visits period lives in the URL so chart + focal metric stay in sync and shareable. */
export function useVisitsPeriod() {
  const search = indexRoute.useSearch();
  const navigate = indexRoute.useNavigate();
  return {
    period: search.period,
    setPeriod: (period: DashboardSearch["period"]) =>
      navigate({
        replace: true,
        search: (previous: Partial<DashboardSearch>) => ({ ...previous, period }),
      }),
  };
}
