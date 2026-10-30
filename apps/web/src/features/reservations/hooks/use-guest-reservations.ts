import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  getGuestReservationsQueryOptions,
  getReservationMutationOptions,
} from "~/features/reservations/api/reservations-query-options";
import { isEmail } from "~/features/reservations/reservation-format";
import { useStoredString } from "~/shared/hooks/use-stored-string";

import type { TrpcOptionsProxy } from "~/lib/trpc-client";

/** ADR 0004: the email alone opens a guest's reservations; this browser remembers the last one used. */
export function useGuestReservations({ host, trpc }: { host: string; trpc: TrpcOptionsProxy }) {
  const queryClient = useQueryClient();
  const { value: email, setValue: setEmail } = useStoredString(`qm-reservations-email:${host}`);
  const [draft, setDraft] = useState("");
  const [cancelError, setCancelError] = useState(false);
  const list = useQuery({ ...getGuestReservationsQueryOptions({ host, email: email ?? "", trpc }), enabled: !!email });
  const cancelMutation = useMutation(getReservationMutationOptions(trpc).cancel);

  async function cancel(reservationId: string) {
    if (!email || cancelMutation.isPending) return;
    setCancelError(false);

    try {
      await cancelMutation.mutateAsync({ host, email, reservationId });
    } catch {
      setCancelError(true);
    }
    await queryClient.invalidateQueries({ queryKey: trpc.reservations.pathKey() });
  }

  return {
    email,
    remember: (nextEmail: string) => setEmail(nextEmail),
    forget: () => setEmail(null),
    draft,
    setDraft,
    lookup: () => isEmail(draft) && setEmail(draft.trim().toLowerCase()),
    reservations: list.data ?? [],
    loading: list.isLoading,
    loadFailed: list.isError,
    cancel,
    cancellingId: cancelMutation.isPending ? cancelMutation.variables.reservationId : null,
    cancelError,
  };
}

export type GuestReservations = ReturnType<typeof useGuestReservations>;
