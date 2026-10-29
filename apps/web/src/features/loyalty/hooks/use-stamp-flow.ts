import { useMutation } from "@tanstack/react-query";
import { useEffect, useReducer, useRef } from "react";

import { getLoyaltyMutationOptions } from "~/features/loyalty/api/loyalty-query-options";
import { getTrpcErrorCode } from "~/features/loyalty/loyalty-utils";

import type { QmCodeInputStatus } from "@qmenut/ui/components/qm-code-input";
import type { LoyaltyCard } from "~/features/loyalty/types";
import type { TrpcOptionsProxy } from "~/lib/trpc-client";

type StampFeedback = Exclude<QmCodeInputStatus, "submitting">;

interface StampState {
  animatedIndex: number;
  code: string;
  feedback: StampFeedback;
  open: boolean;
  quantity: number;
}

type StampAction =
  | { type: "animation-finished" }
  | { type: "changed"; code: string }
  | { type: "failed"; feedback: Exclude<StampFeedback, "idle"> }
  | { type: "opened" }
  | { type: "outcome"; animatedIndex: number }
  | { type: "quantity"; quantity: number }
  | { type: "succeeded" }
  | { type: "throttle-finished" };

const INITIAL_STATE: StampState = {
  animatedIndex: -1,
  code: "",
  feedback: "idle",
  open: false,
  quantity: 1,
};

function stampReducer(state: StampState, action: StampAction): StampState {
  switch (action.type) {
    case "animation-finished":
      return { ...state, animatedIndex: -1 };
    case "changed":
      if (state.feedback === "throttled") return state;
      return { ...state, code: action.code, feedback: "idle" };
    case "failed":
      return {
        ...state,
        code: action.feedback === "already" || action.feedback === "throttled" ? state.code : "",
        feedback: action.feedback,
      };
    case "opened":
      return { ...state, open: true };
    case "outcome":
      return { ...state, animatedIndex: action.animatedIndex };
    case "quantity":
      return { ...state, quantity: action.quantity };
    case "succeeded":
      return INITIAL_STATE;
    case "throttle-finished":
      return { ...state, code: "", feedback: "idle" };
  }
}

interface StampFlowInput {
  card: LoyaltyCard | null;
  host: string;
  limit: number;
  refreshCard: () => Promise<void>;
  target: number;
  token: string | null | undefined;
  trpc: TrpcOptionsProxy;
}

export function useStampFlow({ card, host, limit, refreshCard, target, token, trpc }: StampFlowInput) {
  const [state, dispatch] = useReducer(stampReducer, INITIAL_STATE);
  const options = getLoyaltyMutationOptions(trpc);
  const mutation = useMutation(options.requestStamps);
  const cancelMutation = useMutation(options.cancelStampRequest);
  const { mutate: dismissOutcome } = useMutation(options.dismissStampOutcome);
  // The notice outlives the dismissal: it stays until the card is refetched (next open or focus).
  const dismissedId = useRef<string | null>(null);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19 useRef requires an explicit initial value.
  const animationTimer = useRef<number | undefined>(undefined);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19 useRef requires an explicit initial value.
  const throttleTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(animationTimer.current);
      window.clearTimeout(throttleTimer.current);
    },
    [],
  );

  const outcome = card?.lastOutcome ?? null;
  const balance = card?.card.stampsBalance ?? 0;

  useEffect(() => {
    if (!outcome || !token || outcome.id === dismissedId.current) return;

    dismissedId.current = outcome.id;
    dismissOutcome({ host, cardToken: token, requestId: outcome.id });
    if (outcome.status !== "accepted") return;
    dispatch({ type: "outcome", animatedIndex: Math.min(balance, target) - 1 });
    window.clearTimeout(animationTimer.current);
    animationTimer.current = window.setTimeout(() => dispatch({ type: "animation-finished" }), 800);
  }, [balance, dismissOutcome, host, outcome, target, token]);

  async function submit(nextCode: string): Promise<void> {
    if (!token || mutation.isPending || state.feedback === "throttled") return;

    try {
      await mutation.mutateAsync({ host, cardToken: token, venueCode: nextCode, quantity: state.quantity });
      dispatch({ type: "succeeded" });
      await refreshCard();
    } catch (error) {
      const code = getTrpcErrorCode(error);

      if (code === "TOO_MANY_REQUESTS") {
        dispatch({ type: "failed", feedback: "throttled" });
        window.clearTimeout(throttleTimer.current);
        throttleTimer.current = window.setTimeout(() => dispatch({ type: "throttle-finished" }), 30_000);
        return;
      }

      dispatch({ type: "failed", feedback: code === "CONFLICT" ? "already" : "error" });
    }
  }

  async function cancel(): Promise<void> {
    const requestId = card?.pendingRequests[0]?.id;
    if (!token || !requestId || cancelMutation.isPending) return;

    try {
      await cancelMutation.mutateAsync({ host, cardToken: token, requestId });
    } catch {
      // NOT_FOUND: staff answered meanwhile, and the refresh below shows their answer.
    }
    await refreshCard();
  }

  return {
    animatedIndex: state.animatedIndex,
    code: state.code,
    limit,
    open: state.open,
    outcome,
    quantity: state.quantity,
    cancel,
    networkError: state.feedback === "error" && mutation.isError && !getTrpcErrorCode(mutation.error),
    status: mutation.isPending ? ("submitting" as const) : state.feedback,
    changeCode: (code: string) => dispatch({ type: "changed", code }),
    openPanel: () => dispatch({ type: "opened" }),
    setQuantity: (quantity: number) => dispatch({ type: "quantity", quantity: Math.min(limit, Math.max(1, quantity)) }),
    submit,
  };
}
