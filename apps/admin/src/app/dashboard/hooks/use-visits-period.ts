import { getRouteApi } from "@tanstack/react-router";
import { useDeferredValue } from "react";

import type { DashboardSearch } from "~/app/dashboard/types";

const indexRoute = getRouteApi("/_auth/");

/** The visits period lives in the URL so chart + focal metric stay in sync and shareable. */
export function useVisitsPeriod() {
  const search = indexRoute.useSearch();
  const navigate = indexRoute.useNavigate();
  // Data reads the deferred period: the previous range stays on screen while the new one loads.
  const period = useDeferredValue(search.period);
  return {
    period,
    refreshing: period !== search.period,
    selectedPeriod: search.period,
    setPeriod: (period: DashboardSearch["period"]) =>
      navigate({
        replace: true,
        search: (previous: Partial<DashboardSearch>) => ({ ...previous, period }),
      }),
  };
}
