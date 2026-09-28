import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useDeferredValue } from "react";

import * as api from "~/features/analytics/api";
import { trpc } from "~/lib/trpc";

const analyticsRoute = getRouteApi("/_auth/analytics");

export function useAnalyticsController() {
  const search = analyticsRoute.useSearch();
  const navigate = analyticsRoute.useNavigate();
  // The previous snapshot stays on screen while the newly selected period loads.
  const period = useDeferredValue(search.period);
  const { data: snapshot } = useSuspenseQuery(api.getAnalyticsSnapshotQueryOptions({ period, trpc }));

  return {
    refreshing: period !== search.period,
    search,
    setPeriod: (period: typeof search.period) =>
      navigate({
        replace: true,
        search: (previous) => ({ ...previous, period }),
      }),
    snapshot,
  };
}
