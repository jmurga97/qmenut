import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import * as api from "~/features/loyalty/api";
import * as services from "~/features/loyalty/services";
import { trpc } from "~/lib/trpc";
import { useNowTicker } from "~/shared/hooks/use-now-ticker";

import type { PendingRedemption } from "~/features/loyalty/types";

const UNDO_NOTICE_MS = 8000;

export type RedemptionQueueState = ReturnType<typeof useRedemptionQueue>;

export function useRedemptionQueue(branchId: string) {
  const queryClient = useQueryClient();
  const now = useNowTicker();
  const [undoNotice, setUndoNotice] = useState<{ transactionId: number } | null>(null);
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
          setUndoNotice({ transactionId: result.transactionId });
          toast.success(`${redemption.rewardName} validado para ${redemption.email}.`, {
            action: { label: "Deshacer", onClick: () => undo(result.transactionId) },
            duration: UNDO_NOTICE_MS,
          });
        },
      },
    );
  }
  function reject(redemptionId: string) {
    validateMutation.reset();
    rejectMutation.mutate({ redemptionId });
  }
  function undo(transactionId: number) {
    if (!undoNotice || undoNotice.transactionId !== transactionId || undoMutation.isPending) return;
    undoMutation.mutate(
      { transactionId, branchId },
      {
        onSuccess: () => setUndoNotice((current) => (current?.transactionId === transactionId ? null : current)),
        onError: () => setUndoNotice((current) => (current?.transactionId === transactionId ? null : current)),
      },
    );
  }
  return {
    actionBusy: validateMutation.isPending || rejectMutation.isPending,
    now,
    pendingQuery,
    reject,
    undo,
    validate,
  };
}
