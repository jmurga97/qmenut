import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import * as api from "~/features/loyalty/api";
import * as services from "~/features/loyalty/services";
import { getErrorMessage } from "~/lib/errors";
import { trpc } from "~/lib/trpc";
import { useNowTicker } from "~/shared/hooks/use-now-ticker";

import type { PendingRedemption } from "~/features/loyalty/types";

export interface UndoNotice {
  error: string | null;
  message: string;
  transactionId: number;
}

const UNDO_NOTICE_MS = 8000;

export type RedemptionQueueState = ReturnType<typeof useRedemptionQueue>;

export function useRedemptionQueue(branchId: string) {
  const queryClient = useQueryClient();
  const now = useNowTicker();
  const [undoNotice, setUndoNotice] = useState<UndoNotice | null>(null);
  const pendingQuery = useQuery({
    ...api.getPendingRedemptionsQueryOptions({ trpc }),
    refetchInterval: () => (document.visibilityState === "visible" ? services.LOYALTY_POLL_INTERVAL_MS : false),
    refetchOnWindowFocus: true,
  });
  const options = api.getLoyaltyMutationOptions({ queryClient, trpc });
  const validateMutation = useMutation(options.validate);
  const rejectMutation = useMutation(options.reject);
  const undoMutation = useMutation(options.undo);
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
  let rowError: string | null = null;
  if (validateMutation.error) rowError = services.getValidationError(validateMutation.error);
  else if (rejectMutation.error) rowError = getErrorMessage(rejectMutation.error);
  return {
    actionBusy: validateMutation.isPending || rejectMutation.isPending,
    now,
    pendingQuery,
    rowError,
    undoBusy: undoMutation.isPending,
    undoNotice,
    reject,
    undo,
    validate,
  };
}
