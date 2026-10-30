import { useQuery } from "@tanstack/react-query";

import * as api from "~/features/reservations/api";
import { trpc } from "~/lib/trpc";

/** Pending requests at the branch, for the nav label; 0 while it can't be asked (no access or no branch). */
export function usePendingReservationsCount({ branchId, enabled }: { branchId?: string; enabled: boolean }): number {
  const { data } = useQuery({
    ...api.getPendingReservationsQueryOptions({ branchId: branchId ?? "", trpc }),
    enabled: enabled && Boolean(branchId),
    refetchInterval: () => (document.visibilityState === "visible" ? api.RESERVATIONS_POLL_MS : false),
    refetchOnWindowFocus: true,
  });

  return enabled ? (data ?? 0) : 0;
}
