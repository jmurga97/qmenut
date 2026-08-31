import { QmCodeInput } from "@qmenut/ui/components/qm-code-input/react";
import { QmLoyaltyCard } from "@qmenut/ui/components/qm-loyalty-card/react";
import { QmLoyaltySignup } from "@qmenut/ui/components/qm-loyalty-signup/react";
import { QmRedeemWait } from "@qmenut/ui/components/qm-redeem-wait/react";
import { QmRewardRow } from "@qmenut/ui/components/qm-reward-row/react";
import { useRouteContext } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useLoyaltyController } from "~/features/loyalty/hooks/use-loyalty-controller";

import type { TFunction } from "i18next";
import type { LoyaltyController } from "~/features/loyalty/hooks/use-loyalty-controller";
import type { LoyaltyReward } from "~/features/loyalty/types";

type IntroController = Extract<LoyaltyController, { phase: "intro" }>;
type SignupController = Extract<LoyaltyController, { phase: "signup" }>;
type RedemptionController = Extract<LoyaltyController, { phase: "redemption" }>;
type CardController = Extract<LoyaltyController, { phase: "card" }>;

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled loyalty phase: ${JSON.stringify(value)}`);
}

export function LoyaltyExperience({ restaurantName }: { restaurantName: string }) {
  const { t } = useTranslation();
  const loyalty = useLoyaltyController();

  switch (loyalty.phase) {
    case "unavailable":
      return (
        <div className="public-route-content-stage" key="unavailable">
          <UnavailableState />
        </div>
      );
    case "loading":
      return <div className="loyalty-loading" aria-label={t("loyalty.loading")} />;
    case "intro":
      return (
        <div className="public-route-content-stage" key="intro">
          <IntroState loyalty={loyalty} />
        </div>
      );
    case "signup":
      return (
        <div className="public-route-content-stage" key="signup">
          <SignupState loyalty={loyalty} />
        </div>
      );
    case "redemption":
      return (
        <div className="public-route-content-stage" key="redemption">
          <RedemptionState loyalty={loyalty} />
        </div>
      );
    case "card":
      return (
        <div className="public-route-content-stage" key="card">
          <CardState loyalty={loyalty} restaurantName={restaurantName} />
        </div>
      );
    default:
      return assertNever(loyalty);
  }
}

function UnavailableState() {
  const { t } = useTranslation();
  return (
    <section className="loyalty-status" aria-labelledby="loyalty-unavailable-title">
      <span className="loyalty-status__stamp" aria-hidden="true" />
      <h2 id="loyalty-unavailable-title">{t("loyalty.unavailable.title")}</h2>
      <p>{t("loyalty.unavailable.body")}</p>
    </section>
  );
}

function IntroState({ loyalty }: { loyalty: IntroController }) {
  const { t } = useTranslation();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const firstReward = loyalty.program.rewards[0];
  const menuHref = locale ? `/${locale}` : "/";

  return (
    <section className="loyalty-status" aria-labelledby="loyalty-intro-title">
      <span className="loyalty-status__stamp" aria-hidden="true" />
      <h2 id="loyalty-intro-title">{t("loyalty.intro.title")}</h2>
      <p>{t("loyalty.intro.body", { count: firstReward?.cost ?? 0, reward: firstReward?.name ?? "" })}</p>
      <p>{t("loyalty.intro.hint")}</p>
      <a className="loyalty-status__cta" href={menuHref}>
        {t("loyalty.intro.menuLink")}
      </a>
    </section>
  );
}

function SignupState({ loyalty }: { loyalty: SignupController }) {
  const { t } = useTranslation();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const firstReward = loyalty.program.rewards[0];
  const submitLabel = t(loyalty.signup.busy ? "loyalty.signup.creating" : "loyalty.signup.submit");

  return (
    <QmLoyaltySignup
      pitch={t("loyalty.signup.pitch", { count: firstReward?.cost ?? 0, reward: firstReward?.name ?? "" })}
      explainer={t("loyalty.signup.explainer")}
      email={loyalty.signup.email}
      emailLabel={t("loyalty.signup.emailLabel")}
      emailPlaceholder={t("loyalty.signup.emailPlaceholder")}
      submitLabel={submitLabel}
      consentAccepted={loyalty.signup.consentAccepted}
      consentLabel={t("loyalty.signup.consentLabel")}
      privacyHref={locale ? `/${locale}/privacidad` : "/privacidad"}
      privacyLinkLabel={t("loyalty.signup.consentPrivacyLink")}
      consentError={t("loyalty.signup.consentRequired")}
      reassurance={t("loyalty.signup.reassurance")}
      error={loyalty.signup.error}
      busy={loyalty.signup.busy}
      onQmInput={(event) => loyalty.signup.setEmail(event.detail.email)}
      onQmConsentChange={(event) => loyalty.signup.setConsentAccepted(event.detail.accepted)}
      onQmSubmit={(event) => void loyalty.signup.submit(event.detail.email, event.detail.consentAccepted)}
    />
  );
}

interface RedemptionCopyInput {
  remainingMs: number;
  status: "expired" | "pending" | "rejected";
  t: TFunction;
}

function redemptionCopy({ status, remainingMs, t }: RedemptionCopyInput) {
  if (status === "pending") {
    return {
      title: t("loyalty.redeem.pendingTitle"),
      hint: t("loyalty.redeem.pendingHint"),
      countdown: t("loyalty.redeem.countdown", { time: formatCountdown(remainingMs) }),
      action: t("loyalty.redeem.cancel"),
    };
  }
  if (status === "rejected") {
    return { title: t("loyalty.redeem.rejectedTitle"), hint: "", countdown: "", action: t("loyalty.redeem.retry") };
  }
  return { title: t("loyalty.redeem.expiredTitle"), hint: "", countdown: "0:00", action: t("loyalty.redeem.return") };
}

function RedemptionState({ loyalty }: { loyalty: RedemptionController }) {
  const { t } = useTranslation();
  const redemption = loyalty.redemption.current;
  const copy = redemptionCopy({
    status: redemption.status,
    remainingMs: loyalty.redemption.remainingMs,
    t,
  });

  return (
    <QmRedeemWait
      status={redemption.status}
      rewardName={redemption.rewardName}
      badge={t("loyalty.redeem.badge", { reward: redemption.rewardName })}
      title={copy.title}
      hint={copy.hint}
      countdown={copy.countdown}
      cancelLabel={copy.action}
      retryLabel={copy.action}
      onQmCancel={() => void loyalty.redemption.cancel()}
      onQmRetry={() => void loyalty.redemption.returnToCard()}
    />
  );
}

function CardState({ loyalty, restaurantName }: { loyalty: CardController; restaurantName: string }) {
  const { t } = useTranslation();
  const card = loyalty.card.data;
  const balance = card.card.stampsBalance;
  const filled = Math.min(balance, loyalty.card.target);

  return (
    <QmLoyaltyCard
      restaurantName={restaurantName}
      email={card.card.email}
      balance={balance}
      target={loyalty.card.target}
      animatedIndex={loyalty.stamp.animatedIndex}
      progressLabel={t("loyalty.card.progress")}
      gridLabel={t("loyalty.card.gridLabel", { filled, total: loyalty.card.target })}
      stampLabel={t("loyalty.card.requestStamp")}
      stampOpen={loyalty.stamp.open}
      redeemed={loyalty.card.redeemedReward !== null}
      redeemedLabel={t("loyalty.card.redeemed")}
      redeemedReward={loyalty.card.redeemedReward ?? ""}
      redeemedFooter={t("loyalty.card.redeemedFooter", { balance, total: loyalty.card.target })}
      onQmStampRequest={loyalty.stamp.openPanel}
    >
      {loyalty.stamp.open && <StampCode stamp={loyalty.stamp} />}
      {card.rewards.map((reward) => (
        <RewardRow
          balance={balance}
          canRedeem={loyalty.card.canRedeem}
          key={reward.id}
          reward={reward}
          onRedeem={() => void loyalty.card.redeem(reward)}
        />
      ))}
    </QmLoyaltyCard>
  );
}

function StampCode({ stamp }: { stamp: CardController["stamp"] }) {
  const { t } = useTranslation();
  return (
    <QmCodeInput
      slot="stamp-panel"
      value={stamp.code}
      status={stamp.status}
      title={t("loyalty.code.title")}
      hint={t("loyalty.code.hint")}
      footnote={t("loyalty.code.footnote")}
      message={stamp.message}
      inputLabel={t("loyalty.code.inputLabel")}
      disabled={stamp.status === "throttled"}
      onQmInput={(event) => stamp.changeCode(event.detail.value)}
      onQmComplete={(event) => void stamp.submit(event.detail.value)}
    />
  );
}

function RewardRow({
  balance,
  canRedeem,
  onRedeem,
  reward,
}: {
  balance: number;
  canRedeem: boolean;
  onRedeem: () => void;
  reward: LoyaltyReward;
}) {
  const { t } = useTranslation();
  const remaining = Math.max(0, reward.cost - balance);

  return (
    <QmRewardRow
      slot="rewards"
      rewardId={reward.id}
      name={reward.name}
      cost={reward.cost}
      remaining={remaining}
      unlocked={reward.unlocked}
      disabled={!canRedeem}
      stampsLabel={t("loyalty.reward.stamps")}
      remainingLabel={t("loyalty.reward.remaining", { count: remaining })}
      redeemLabel={t(canRedeem ? "loyalty.reward.redeem" : "loyalty.reward.locked")}
      busyLabel={t("loyalty.reward.redeeming")}
      onQmRedeem={onRedeem}
    />
  );
}
