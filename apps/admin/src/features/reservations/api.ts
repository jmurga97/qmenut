import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

type ApiContext = { trpc: TrpcOptionsProxy };
type BranchContext = ApiContext & { branchId: string };

// Staff keep the Today tab open during service: about once a minute is enough to see new requests.
export const RESERVATIONS_POLL_MS = 60_000;

export function getReservationDayQueryOptions({ branchId, date, trpc }: BranchContext & { date?: string }) {
  return trpc.admin.reservations.day.queryOptions({ branchId, date });
}

export function getPendingReservationsQueryOptions({ branchId, trpc }: BranchContext) {
  return trpc.admin.reservations.pendingCount.queryOptions({ branchId });
}

export function getReservationSettingsQueryOptions({ branchId, trpc }: BranchContext) {
  return trpc.admin.reservations.settings.queryOptions({ branchId });
}

export function getReservationClosuresQueryOptions({ branchId, trpc }: BranchContext) {
  return trpc.admin.reservations.closures.queryOptions({ branchId });
}

export function getReservationMutationOptions({ queryClient, trpc }: ApiContext & { queryClient: QueryClient }) {
  const options = {
    onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.admin.reservations.pathKey() }),
  };

  return {
    accept: trpc.admin.reservations.accept.mutationOptions(options),
    addClosure: trpc.admin.reservations.addClosure.mutationOptions(options),
    cancel: trpc.admin.reservations.cancel.mutationOptions(options),
    decline: trpc.admin.reservations.decline.mutationOptions(options),
    removeClosure: trpc.admin.reservations.removeClosure.mutationOptions(options),
    saveSettings: trpc.admin.reservations.saveSettings.mutationOptions(options),
  };
}
