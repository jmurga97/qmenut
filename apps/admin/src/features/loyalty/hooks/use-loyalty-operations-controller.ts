import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import * as api from "~/features/loyalty/api";
import * as services from "~/features/loyalty/services";
import { getErrorMessage } from "~/lib/errors";
import { trpc } from "~/lib/trpc";

import type { PendingRedemption } from "~/features/loyalty/types";

type UndoNotice = { error: string | null; message: string; transactionId: number };
const UNDO_NOTICE_MS = 8000;
export function useLoyaltyOperationsController(branchId: string) {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [undoNotice, setUndoNotice] = useState<UndoNotice | null>(null);
  const venueCodeQuery = useQuery({
    ...api.getVenueCodeQueryOptions({ branchId, trpc }),
    refetchInterval: (query) => {
      const expiry = query.state.data?.expiresAt;
      return expiry ? Math.max(1000, expiry - Date.now()) : false;
    },
    refetchOnWindowFocus: true,
  });
  const pendingQuery = useQuery({
    ...api.getPendingRedemptionsQueryOptions({ trpc }),
    refetchInterval: () => (document.visibilityState === "visible" ? services.LOYALTY_POLL_INTERVAL_MS : false),
    refetchOnWindowFocus: true,
  });
  const mutationContext = { queryClient, trpc };
  const options = api.getLoyaltyMutationOptions(mutationContext);
  const validateMutation = useMutation(options.validate);
  const rejectMutation = useMutation(options.reject);
  const undoMutation = useMutation(options.undo);
  const expiresAt = venueCodeQuery.data?.expiresAt ?? now;
  const remainingMs = Math.max(0, expiresAt - now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!undoNotice) return;
    const timer = window.setTimeout(() => setUndoNotice(null), UNDO_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [undoNotice]);
  function validate(redemption: PendingRedemption) {
    rejectMutation.reset();
    validateMutation.mutate(
      { redemptionId: redemption.id, branchId },
      {
        onSuccess: (result) => {
          setUndoNotice({
            transactionId: result.transactionId,
            message: `${redemption.rewardName} validado para ${redemption.email}.`,
            error: null,
          });
        },
      },
    );
  }
  function reject(redemptionId: string) {
    validateMutation.reset();
    rejectMutation.mutate({ redemptionId });
  }
  function undo() {
    if (!undoNotice) return;
    undoMutation.mutate(
      { transactionId: undoNotice.transactionId, branchId },
      {
        onSuccess: () => setUndoNotice(null),
        onError: (error) => {
          setUndoNotice((current) => (current ? { ...current, error: services.getUndoError(error) } : null));
        },
      },
    );
  }
  const actionBusy = validateMutation.isPending || rejectMutation.isPending;
  let rowError: string | null = null;
  if (validateMutation.error) rowError = services.getValidationError(validateMutation.error);
  else if (rejectMutation.error) rowError = getErrorMessage(rejectMutation.error);
  return {
    actionBusy,
    now,
    pendingQuery,
    remainingMs,
    rowError,
    undoBusy: undoMutation.isPending,
    undoNotice,
    venueCodeQuery,
    reject,
    undo,
    validate,
  };
}
