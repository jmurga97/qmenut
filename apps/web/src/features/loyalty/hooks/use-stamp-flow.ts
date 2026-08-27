import { useMutation } from "@tanstack/react-query";
import { useEffect, useReducer, useRef } from "react";

import { getLoyaltyMutationOptions } from "~/features/loyalty/api/loyalty-query-options";
import { getTrpcErrorCode } from "~/features/loyalty/loyalty-utils";

import type { QmCodeInputStatus } from "@qmenut/ui/components/qm-code-input";
import type { TrpcOptionsProxy } from "~/lib/trpc-client";

type StampFeedback = Exclude<QmCodeInputStatus, "submitting">;

interface StampState {
  animatedIndex: number;
  code: string;
  feedback: StampFeedback;
  open: boolean;
}

type StampAction =
  | { type: "animation-finished" }
  | { type: "changed"; code: string }
  | { type: "failed"; feedback: Exclude<StampFeedback, "idle"> }
  | { type: "opened" }
  | { type: "succeeded"; animatedIndex: number }
  | { type: "throttle-finished" };

const INITIAL_STATE: StampState = {
  animatedIndex: -1,
  code: "",
  feedback: "idle",
  open: false,
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
    case "succeeded":
      return { animatedIndex: action.animatedIndex, code: "", feedback: "idle", open: false };
    case "throttle-finished":
      return { ...state, code: "", feedback: "idle" };
  }
}

interface StampFlowInput {
  host: string;
  refreshCard: () => Promise<void>;
  target: number;
  token: string | null | undefined;
  trpc: TrpcOptionsProxy;
}

export function useStampFlow({ host, refreshCard, target, token, trpc }: StampFlowInput) {
  const [state, dispatch] = useReducer(stampReducer, INITIAL_STATE);
  const mutation = useMutation(getLoyaltyMutationOptions(trpc).earnStamp);
  const animationTimer = useRef<number | undefined>(undefined);
  const throttleTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(animationTimer.current);
      window.clearTimeout(throttleTimer.current);
    },
    [],
  );

  async function submit(nextCode: string): Promise<void> {
    if (!token || mutation.isPending || state.feedback === "throttled") return;

    try {
      const result = await mutation.mutateAsync({ host, cardToken: token, venueCode: nextCode });
      dispatch({ type: "succeeded", animatedIndex: Math.min(result.newBalance, target) - 1 });
      await refreshCard();
      window.clearTimeout(animationTimer.current);
      animationTimer.current = window.setTimeout(() => dispatch({ type: "animation-finished" }), 800);
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

  return {
    animatedIndex: state.animatedIndex,
    code: state.code,
    open: state.open,
    status: mutation.isPending ? ("submitting" as const) : state.feedback,
    changeCode: (code: string) => dispatch({ type: "changed", code }),
    openPanel: () => dispatch({ type: "opened" }),
    submit,
  };
}
