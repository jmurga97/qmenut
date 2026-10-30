import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import * as api from "~/features/reservations/api";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";

import type { StaffReservation } from "~/features/reservations/types";

/** A decline or cancel waits for ConfirmAction; accepting doesn't, since the guest can still cancel. */
export interface PendingConfirmation {
  action: "decline" | "cancel";
  reservation: StaffReservation;
}

export function useReservationDay({ branchId, date }: { branchId: string; date?: string }) {
  const queryClient = useQueryClient();
  const dayQuery = useQuery({
    ...api.getReservationDayQueryOptions({ branchId, date: date || undefined, trpc }),
    placeholderData: (previous) => previous,
    refetchInterval: () => (document.visibilityState === "visible" ? api.RESERVATIONS_POLL_MS : false),
    refetchOnWindowFocus: true,
  });
  const options = api.getReservationMutationOptions({ queryClient, trpc });
  const acceptMutation = useMutation(options.accept);
  const declineMutation = useMutation(options.decline);
  const cancelMutation = useMutation(options.cancel);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);

  function accept(reservation: StaffReservation) {
    acceptMutation.mutate(
      { reservationId: reservation.id },
      {
        onSuccess: () =>
          toast.success(i18n.t("reservations___Reserva de {{name}} aceptada.", { name: reservation.guestName })),
      },
    );
  }

  function confirm() {
    if (!confirmation) return;
    const { action, reservation } = confirmation;
    const mutation = action === "decline" ? declineMutation : cancelMutation;
    const message =
      action === "decline"
        ? i18n.t("reservations___Reserva de {{name}} rechazada.", { name: reservation.guestName })
        : i18n.t("reservations___Reserva de {{name}} cancelada.", { name: reservation.guestName });

    mutation.mutate(
      { reservationId: reservation.id },
      {
        onSuccess: () => toast.success(message),
        onSettled: () => setConfirmation(null),
      },
    );
  }

  return {
    dayQuery,
    accept,
    actionBusy: acceptMutation.isPending || declineMutation.isPending || cancelMutation.isPending,
    confirmation,
    askToConfirm: setConfirmation,
    closeConfirmation: () => setConfirmation(null),
    confirm,
  };
}

export type ReservationDayState = ReturnType<typeof useReservationDay>;
