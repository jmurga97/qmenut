import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { getLoyaltyProgramQueryOptions } from "~/features/loyalty/api/loyalty-query-options";
import { useLoyaltyCardSession } from "~/features/loyalty/hooks/use-loyalty-card-session";
import { useLoyaltyConsent } from "~/features/loyalty/hooks/use-loyalty-consent";
import { useLoyaltySignup } from "~/features/loyalty/hooks/use-loyalty-signup";
import { useRedemptionFlow } from "~/features/loyalty/hooks/use-redemption-flow";
import { useStampFlow } from "~/features/loyalty/hooks/use-stamp-flow";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { QmCodeInputStatus } from "@qmenut/ui/components/qm-code-input";

function getCodeMessage(status: QmCodeInputStatus, t: ReturnType<typeof useTranslation>["t"]): string {
  if (status === "throttled") return t("loyalty.code.throttled");
  if (status === "already") return t("loyalty.code.already");
  if (status === "error") return t("loyalty.code.invalid");
  return "";
}

export function useLoyaltyController() {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { t } = useTranslation();
  const fromQr = useSearch({ from: "/{-$locale}", select: (search) => search.utm_source === "qr" });
  const { data: program } = useSuspenseQuery(getLoyaltyProgramQueryOptions({ host, trpc }));
  const session = useLoyaltyCardSession({ host, trpc });
  const signupFlow = useLoyaltySignup({ host, trpc, setToken: session.setToken });
  const consentFlow = useLoyaltyConsent({
    cardToken: session.token,
    host,
    refreshCard: session.refreshCard,
    trpc,
  });
  const stampFlow = useStampFlow({
    host,
    trpc,
    refreshCard: session.refreshCard,
    target: session.target,
    token: session.token,
  });
  const redemptionFlow = useRedemptionFlow({
    card: session.card,
    host,
    trpc,
    refreshCard: session.refreshCard,
    setPendingRedemption: session.setPendingRedemption,
    token: session.token,
  });
  const cardError = session.error ? t("loyalty.errors.loadCard") : "";
  const signup = {
    busy: signupFlow.busy,
    consentAccepted: signupFlow.consentAccepted,
    email: signupFlow.email,
    error: signupFlow.error ? t("loyalty.errors.createCard") : cardError,
    setConsentAccepted: signupFlow.setConsentAccepted,
    setEmail: signupFlow.setEmail,
    submit: signupFlow.submit,
  };
  const consent = {
    busy: consentFlow.busy,
    consentAccepted: consentFlow.consentAccepted,
    email: consentFlow.email,
    error: consentFlow.error ? t("loyalty.errors.acceptConsent") : "",
    setConsentAccepted: consentFlow.setConsentAccepted,
    setEmail: consentFlow.setEmail,
    submit: consentFlow.submit,
  };
  const stamp = {
    animatedIndex: stampFlow.animatedIndex,
    code: stampFlow.code,
    message: getCodeMessage(stampFlow.status, t),
    open: stampFlow.open,
    status: stampFlow.status,
    changeCode: stampFlow.changeCode,
    openPanel: stampFlow.openPanel,
    submit: stampFlow.submit,
  };
  const redemption = {
    busy: redemptionFlow.busy,
    current: redemptionFlow.current,
    remainingMs: redemptionFlow.remainingMs,
    cancel: redemptionFlow.cancel,
    returnToCard: redemptionFlow.returnToCard,
  };
  const card = {
    data: session.card,
    canRedeem: fromQr && !session.consentRequired,
    error: cardError,
    redeemedReward: redemptionFlow.redeemedReward,
    target: session.target,
    redeem: redemptionFlow.redeem,
  };
  const models = { card, consent, program, redemption, signup, stamp };

  if (!program || program.rewards.length === 0) {
    return { ...models, phase: "unavailable" as const };
  }

  if (!session.hydrated || session.loading) {
    return { ...models, phase: "loading" as const };
  }

  if (!session.card) {
    if (!fromQr) {
      return { ...models, phase: "intro" as const, program };
    }
    return { ...models, phase: "signup" as const, program };
  }

  if (session.consentRequired) {
    return {
      ...models,
      phase: "consent" as const,
      card: { ...card, data: session.card },
      program,
    };
  }

  if (redemptionFlow.current) {
    return {
      ...models,
      phase: "redemption" as const,
      card: { ...card, data: session.card },
      program,
      redemption: { ...redemption, current: redemptionFlow.current },
    };
  }

  return {
    ...models,
    phase: "card" as const,
    card: { ...card, data: session.card },
    program,
  };
}

export type LoyaltyController = ReturnType<typeof useLoyaltyController>;
