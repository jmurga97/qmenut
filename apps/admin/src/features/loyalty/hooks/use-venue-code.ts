import { useQuery } from "@tanstack/react-query";

import * as api from "~/features/loyalty/api";
import { trpc } from "~/lib/trpc";
import { useNowTicker } from "~/shared/hooks/use-now-ticker";

/** Backoff while a code is already expired, so we never busy-poll every second. */
const EXPIRED_REFETCH_MS = 30_000;

export function useVenueCode(branchId: string) {
  const now = useNowTicker();
  const venueCodeQuery = useQuery({
    ...api.getVenueCodeQueryOptions({ branchId, trpc }),
    // Refresh right when the code expires; once it has expired, back off instead.
    // Infinity disables the interval while there is no code yet.
    refetchInterval: (query): number => {
      const expiry = query.state.data?.expiresAt;
      if (!expiry) return Infinity;
      const remainingMs = expiry - Date.now();
      return remainingMs > 0 ? remainingMs : EXPIRED_REFETCH_MS;
    },
    refetchOnWindowFocus: true,
  });
  const expiresAt = venueCodeQuery.data?.expiresAt ?? now;
  return { now, remainingMs: Math.max(0, expiresAt - now), venueCodeQuery };
}
