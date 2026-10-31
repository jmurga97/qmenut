import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface ReservationsQueryInput {
  host: string;
  trpc: TrpcOptionsProxy;
}

/** YYYY-MM to the first and last day of that month. */
function monthRange(month: string): { from: string; to: string } {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function getAvailabilityQueryOptions({ host, month, trpc }: ReservationsQueryInput & { month: string }) {
  // Tables fill while the guest decides: refetch on focus, keep the last month on screen while the next loads.
  return trpc.reservations.availability.queryOptions(
    { host, ...monthRange(month) },
    { placeholderData: (previous) => previous, refetchOnWindowFocus: "always" },
  );
}

export function getGuestReservationsQueryOptions({ host, email, trpc }: ReservationsQueryInput & { email: string }) {
  return trpc.reservations.byEmail.queryOptions({ host, email }, { refetchOnWindowFocus: "always" });
}

export function getEmailFromLinkQueryOptions({
  host,
  reservationId,
  trpc,
}: ReservationsQueryInput & { reservationId: string }) {
  return trpc.reservations.emailFromLink.queryOptions({ host, reservationId }, { staleTime: Infinity, retry: false });
}

// Fail offline writes immediately so reconnecting cannot silently submit an old request.
export function getReservationMutationOptions(trpc: TrpcOptionsProxy) {
  return {
    cancel: trpc.reservations.cancel.mutationOptions({ networkMode: "always" }),
    confirm: trpc.reservations.confirm.mutationOptions({ networkMode: "always" }),
    create: trpc.reservations.create.mutationOptions({ networkMode: "always" }),
  };
}
