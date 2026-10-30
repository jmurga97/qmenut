import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as api from "~/features/loyalty/api";
import * as services from "~/features/loyalty/services";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { useNowTicker } from "~/shared/hooks/use-now-ticker";

import type { PendingStampRequest } from "~/features/loyalty/types";

const UNDO_NOTICE_MS = 8000;

export type StampRequestQueueState = ReturnType<typeof useStampRequestQueue>;

export function useStampRequestQueue(branchId: string) {
  const queryClient = useQueryClient();
  const now = useNowTicker();
  const pendingQuery = useQuery({
    ...api.getPendingStampRequestsQueryOptions({ branchId, trpc }),
    refetchInterval: () => (document.visibilityState === "visible" ? services.LOYALTY_POLL_INTERVAL_MS : false),
    refetchOnWindowFocus: true,
  });
  const handledQuery = useQuery(api.getHandledStampRequestsQueryOptions({ branchId, trpc }));
  const options = api.getLoyaltyMutationOptions({ queryClient, trpc });
  const acceptMutation = useMutation(options.acceptStampRequest);
  const declineMutation = useMutation(options.declineStampRequest);
  const undoMutation = useMutation(options.undoStampRequest);

  function showUndo(message: string, requestId: string) {
    toast.success(message, {
      action: { label: i18n.t("loyalty___Deshacer"), onClick: () => undo(requestId) },
      duration: UNDO_NOTICE_MS,
    });
  }

  function accept(request: PendingStampRequest, quantity: number) {
    declineMutation.reset();
    acceptMutation.mutate(
      { requestId: request.id, quantity },
      {
        onSuccess: () =>
          showUndo(i18n.t("loyalty___Solicitud de {{email}} aceptada.", { email: request.email }), request.id),
      },
    );
  }

  function decline(request: PendingStampRequest) {
    acceptMutation.reset();
    declineMutation.mutate(
      { requestId: request.id },
      {
        onSuccess: () =>
          showUndo(i18n.t("loyalty___Solicitud de {{email}} rechazada.", { email: request.email }), request.id),
      },
    );
  }

  function undo(requestId: string) {
    if (undoMutation.isPending) return;
    undoMutation.mutate({ requestId, branchId });
  }

  return {
    accept,
    actionBusy: acceptMutation.isPending || declineMutation.isPending || undoMutation.isPending,
    decline,
    handledQuery,
    now,
    pendingQuery,
    undo,
  };
}
