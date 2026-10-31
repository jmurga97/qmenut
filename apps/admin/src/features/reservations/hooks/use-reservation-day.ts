import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import * as api from "~/features/reservations/api";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";

import type { StaffReservation } from "~/features/reservations/types";

export function useReservationDay({ branchId, date }: { branchId: string; date?: string }) {
  const queryClient = useQueryClient();
  const dayQuery = useQuery({
    ...api.getReservationDayQueryOptions({ branchId, date: date || undefined, trpc }),
    placeholderData: (previous) => previous,
    refetchInterval: () => (document.visibilityState === "visible" ? api.RESERVATIONS_POLL_MS : false),
    refetchOnWindowFocus: true,
  });
  const options = api.getReservationMutationOptions({ queryClient, trpc });
  const cancelMutation = useMutation(options.cancel);
  // The reservation waiting for ConfirmAction before it is cancelled.
  const [confirmation, setConfirmation] = useState<StaffReservation | null>(null);

  function confirm() {
    if (!confirmation) return;

    cancelMutation.mutate(
      { reservationId: confirmation.id },
      {
        onSuccess: () =>
          toast.success(i18n.t("reservations___Reserva de {{name}} cancelada.", { name: confirmation.guestName })),
        onSettled: () => setConfirmation(null),
      },
    );
  }

  return {
    dayQuery,
    actionBusy: cancelMutation.isPending,
    confirmation,
    askToConfirm: setConfirmation,
    closeConfirmation: () => setConfirmation(null),
    confirm,
  };
}

export type ReservationDayState = ReturnType<typeof useReservationDay>;
