import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import * as api from "~/features/analytics/api";
import { trpc } from "~/lib/trpc";

const analyticsRoute = getRouteApi("/_auth/analytics");

export function useAnalyticsController() {
  const search = analyticsRoute.useSearch();
  const navigate = analyticsRoute.useNavigate();
  const { data: snapshot } = useSuspenseQuery(api.getAnalyticsSnapshotQueryOptions({ period: search.period, trpc }));

  return {
    search,
    setPeriod: (period: typeof search.period) =>
      navigate({
        replace: true,
        search: (previous) => ({ ...previous, period }),
      }),
    snapshot,
  };
}
