import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { getLoyaltyProgramQueryOptions } from "~/features/loyalty/api/loyalty-query-options";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { AppRouter } from "@qmenut/api/router";
import type { QmCodeInputStatus } from "@qmenut/ui/components/qm-code-input";
import type { QmRedeemWaitStatus } from "@qmenut/ui/components/qm-redeem-wait";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type LoyaltyProgram = NonNullable<RouterOutputs["loyalty"]["program"]>;
export type LoyaltyCard = RouterOutputs["loyalty"]["getCard"];
export type LoyaltyReward = LoyaltyCard["rewards"][number];

interface RedemptionState {
  expiresAt: number;
  id: string;
  rewardName: string;
  status: QmRedeemWaitStatus;
}

interface TrpcErrorLike {
  data?: { code?: string };
  message?: string;
}

function errorCode(error: unknown): string | undefined {
  return (error as TrpcErrorLike | undefined)?.data?.code;
}

function storageKey(host: string): string {
  return `qm-loyalty-card:${host}`;
}

export function useLoyaltyController() {
  const trpc = useAppTrpc();
  const queryClient = useQueryClient();
  const { host } = useTenantContext();
  const { t } = useTranslation();
  const { data: program } = useSuspenseQuery(getLoyaltyProgramQueryOptions({ host, trpc }));
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [signupError, setSignupError] = useState("");
  const [stampOpen, setStampOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<QmCodeInputStatus>("idle");
  const [codeMessage, setCodeMessage] = useState("");
  const [animatedIndex, setAnimatedIndex] = useState(-1);
  const [redemption, setRedemption] = useState<RedemptionState | null>(null);
  const [redeemedReward, setRedeemedReward] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const animationTimer = useRef<number | undefined>(undefined);
  const throttleTimer = useRef<number | undefined>(undefined);

  const cardOptions = trpc.loyalty.getCard.queryOptions({ host, cardToken: token ?? "" });
  const cardQuery = useQuery({ ...cardOptions, enabled: hydrated && token !== null, retry: false });
  const createCardMutation = useMutation(trpc.loyalty.createCard.mutationOptions());
  const earnStampMutation = useMutation(trpc.loyalty.earnStamp.mutationOptions());
  const requestRedemptionMutation = useMutation(trpc.loyalty.requestRedemption.mutationOptions());
  const cancelRedemptionMutation = useMutation(trpc.loyalty.cancelRedemption.mutationOptions());

  const statusOptions = trpc.loyalty.redemptionStatus.queryOptions({
    host,
    cardToken: token ?? "",
    redemptionId: redemption?.id ?? "",
  });
  const statusQuery = useQuery({
    ...statusOptions,
    enabled: token !== null && redemption?.status === "pending",
    refetchInterval: 2000,
    retry: false,
  });

  const refreshCard = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: cardOptions.queryKey });
  }, [cardOptions.queryKey, queryClient]);

  useEffect(() => {
    setToken(window.localStorage.getItem(storageKey(host)));
    setHydrated(true);
  }, [host]);

  useEffect(() => {
    if (!cardQuery.error || errorCode(cardQuery.error) !== "UNAUTHORIZED") return;
    window.localStorage.removeItem(storageKey(host));
    setToken(null);
  }, [cardQuery.error, host]);

  useEffect(() => {
    const pending = cardQuery.data?.pendingRedemption;
    if (!pending || redemption || redeemedReward) return;
    setRedemption({
      id: pending.id,
      rewardName: pending.rewardName,
      expiresAt: pending.expiresAt,
      status: pending.expiresAt <= Date.now() ? "expired" : "pending",
    });
  }, [cardQuery.data?.pendingRedemption, redeemedReward, redemption]);

  useEffect(() => {
    if (redemption?.status !== "pending") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [redemption?.status]);

  useEffect(() => {
    if (!redemption || redemption.status !== "pending" || now < redemption.expiresAt) return;
    setRedemption((current) => (current ? { ...current, status: "expired" } : current));
  }, [now, redemption]);

  useEffect(() => {
    const status = statusQuery.data?.status;
    if (!redemption || !status || status === "pending") return;
    if (status === "validated") {
      setRedeemedReward(redemption.rewardName);
      setRedemption(null);
      void refreshCard();
      return;
    }
    setRedemption((current) => (current ? { ...current, status } : current));
  }, [redemption, refreshCard, statusQuery.data?.status]);

  useEffect(
    () => () => {
      window.clearTimeout(animationTimer.current);
      window.clearTimeout(throttleTimer.current);
    },
    [],
  );

  const target = useMemo(() => {
    if (!cardQuery.data?.rewards.length) return 0;
    return (
      cardQuery.data.rewards.find((reward) => reward.cost > cardQuery.data.card.stampsBalance)?.cost ??
      cardQuery.data.rewards.at(-1)?.cost ??
      0
    );
  }, [cardQuery.data]);

  async function submitEmail(nextEmail: string) {
    setSignupError("");
    try {
      const result = await createCardMutation.mutateAsync({ host, email: nextEmail });
      window.localStorage.setItem(storageKey(host), result.cardToken);
      setToken(result.cardToken);
    } catch {
      setSignupError(t("loyalty.errors.createCard"));
    }
  }

  async function submitCode(nextCode: string) {
    if (!token || earnStampMutation.isPending || codeStatus === "throttled") return;
    setCodeStatus("submitting");
    setCodeMessage("");
    try {
      const result = await earnStampMutation.mutateAsync({ host, cardToken: token, venueCode: nextCode });
      setAnimatedIndex(Math.min(result.newBalance, target) - 1);
      setStampOpen(false);
      setCode("");
      setCodeStatus("idle");
      await refreshCard();
      animationTimer.current = window.setTimeout(() => setAnimatedIndex(-1), 800);
    } catch (error) {
      if (errorCode(error) === "TOO_MANY_REQUESTS") {
        setCodeStatus("throttled");
        setCodeMessage(t("loyalty.code.throttled"));
        throttleTimer.current = window.setTimeout(() => {
          setCodeStatus("idle");
          setCodeMessage("");
          setCode("");
        }, 30_000);
        return;
      }
      if (errorCode(error) === "CONFLICT") {
        setCodeStatus("already");
        setCodeMessage(t("loyalty.code.already"));
        return;
      }
      setCodeStatus("error");
      setCodeMessage(t("loyalty.code.invalid"));
      setCode("");
    }
  }

  async function redeem(reward: LoyaltyReward) {
    if (!token || requestRedemptionMutation.isPending) return;
    try {
      const result = await requestRedemptionMutation.mutateAsync({ host, cardToken: token, rewardId: reward.id });
      setNow(Date.now());
      setRedemption({
        id: result.redemptionId,
        rewardName: reward.name,
        expiresAt: result.expiresAt,
        status: "pending",
      });
    } catch {
      await refreshCard();
    }
  }

  async function cancelRedemption() {
    if (!token || !redemption) return;
    try {
      await cancelRedemptionMutation.mutateAsync({
        host,
        cardToken: token,
        redemptionId: redemption.id,
      });
      setRedemption(null);
      await refreshCard();
    } catch {
      await statusQuery.refetch();
    }
  }

  async function retryRedemption() {
    await statusQuery.refetch();
    await refreshCard();
    setRedemption(null);
  }

  return {
    animatedIndex,
    card: cardQuery.data ?? null,
    cardError: cardQuery.error && errorCode(cardQuery.error) !== "UNAUTHORIZED" ? t("loyalty.errors.loadCard") : "",
    cardLoading: hydrated && token !== null && cardQuery.isLoading,
    code,
    codeMessage,
    codeStatus,
    email,
    hydrated,
    program,
    redeemedReward,
    redemption,
    redemptionRemainingMs: redemption ? Math.max(0, redemption.expiresAt - now) : 0,
    signupBusy: createCardMutation.isPending,
    signupError,
    stampOpen,
    target,
    cancelRedemption,
    redeem,
    retryRedemption,
    setCode: (value: string) => {
      if (codeStatus === "throttled") return;
      setCode(value);
      if (codeStatus !== "idle") {
        setCodeStatus("idle");
        setCodeMessage("");
      }
    },
    setEmail,
    setStampOpen,
    submitCode,
    submitEmail,
  };
}
