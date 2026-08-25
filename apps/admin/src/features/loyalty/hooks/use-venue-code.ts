import { useQuery } from "@tanstack/react-query";

import * as api from "~/features/loyalty/api";
import { trpc } from "~/lib/trpc";
import { useNowTicker } from "~/shared/hooks/use-now-ticker";

export function useVenueCode(branchId: string) {
  const now = useNowTicker();
  const venueCodeQuery = useQuery({
    ...api.getVenueCodeQueryOptions({ branchId, trpc }),
    refetchInterval: (query) => {
      const expiry = query.state.data?.expiresAt;
      return expiry ? Math.max(1000, expiry - Date.now()) : false;
    },
    refetchOnWindowFocus: true,
  });
  const expiresAt = venueCodeQuery.data?.expiresAt ?? now;
  return { now, remainingMs: Math.max(0, expiresAt - now), venueCodeQuery };
}
