import { QmCodeInput } from "@qmenut/ui/components/qm-code-input/react";
import { QmLoyaltyCard } from "@qmenut/ui/components/qm-loyalty-card/react";
import { QmLoyaltySignup } from "@qmenut/ui/components/qm-loyalty-signup/react";
import { QmRedeemWait } from "@qmenut/ui/components/qm-redeem-wait/react";
import { QmRewardRow } from "@qmenut/ui/components/qm-reward-row/react";
import { useTranslation } from "react-i18next";

import { useLoyaltyController } from "~/features/loyalty/hooks/use-loyalty-controller";

import type { TFunction } from "i18next";
import type { LoyaltyReward } from "~/features/loyalty/hooks/use-loyalty-controller";

type LoyaltyController = ReturnType<typeof useLoyaltyController>;

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function LoyaltyExperience({ restaurantName }: { restaurantName: string }) {
  const { t } = useTranslation();
  const loyalty = useLoyaltyController();

  if (!loyalty.program || loyalty.program.rewards.length === 0) {
    return (
      <div className="loyalty-stage" key="unavailable">
        <UnavailableState />
      </div>
    );
  }

  if (!loyalty.hydrated || loyalty.cardLoading) {
    return <div className="loyalty-loading" aria-label={t("loyalty.loading")} />;
  }

  if (!loyalty.card) {
    return (
      <div className="loyalty-stage" key="signup">
        <SignupState loyalty={loyalty} />
      </div>
    );
  }

  if (loyalty.redemption) {
    return (
      <div className="loyalty-stage" key="redemption">
        <RedemptionState loyalty={loyalty} />
      </div>
    );
  }

  return (
    <div className="loyalty-stage" key="card">
      <CardState loyalty={loyalty} restaurantName={restaurantName} />
    </div>
  );
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

function SignupState({ loyalty }: { loyalty: LoyaltyController }) {
  const { t } = useTranslation();
  const firstReward = loyalty.program?.rewards[0];
  const submitLabel = t(loyalty.signupBusy ? "loyalty.signup.creating" : "loyalty.signup.submit");

  return (
    <QmLoyaltySignup
      pitch={t("loyalty.signup.pitch", { count: firstReward?.cost ?? 0, reward: firstReward?.name ?? "" })}
      explainer={t("loyalty.signup.explainer")}
      email={loyalty.email}
      emailLabel={t("loyalty.signup.emailLabel")}
      emailPlaceholder={t("loyalty.signup.emailPlaceholder")}
      submitLabel={submitLabel}
      reassurance={t("loyalty.signup.reassurance")}
      error={loyalty.signupError || loyalty.cardError}
      busy={loyalty.signupBusy}
      onQmInput={(event) => loyalty.setEmail(event.detail.email)}
      onQmSubmit={(event) => void loyalty.submitEmail(event.detail.email)}
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

function RedemptionState({ loyalty }: { loyalty: LoyaltyController }) {
  const { t } = useTranslation();
  const redemption = loyalty.redemption;
  if (!redemption) return null;
  const copy = redemptionCopy({
    status: redemption.status,
    remainingMs: loyalty.redemptionRemainingMs,
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
      onQmCancel={() => void loyalty.cancelRedemption()}
      onQmRetry={() => void loyalty.retryRedemption()}
    />
  );
}

function CardState({ loyalty, restaurantName }: { loyalty: LoyaltyController; restaurantName: string }) {
  const { t } = useTranslation();
  const card = loyalty.card;
  if (!card) return null;
  const balance = card.card.stampsBalance;
  const filled = Math.min(balance, loyalty.target);

  return (
    <QmLoyaltyCard
      restaurantName={restaurantName}
      email={card.card.email}
      balance={balance}
      target={loyalty.target}
      animatedIndex={loyalty.animatedIndex}
      progressLabel={t("loyalty.card.progress")}
      gridLabel={t("loyalty.card.gridLabel", { filled, total: loyalty.target })}
      stampLabel={t("loyalty.card.requestStamp")}
      stampOpen={loyalty.stampOpen}
      redeemed={loyalty.redeemedReward !== null}
      redeemedLabel={t("loyalty.card.redeemed")}
      redeemedReward={loyalty.redeemedReward ?? ""}
      redeemedFooter={t("loyalty.card.redeemedFooter", { balance, total: loyalty.target })}
      onQmStampRequest={() => loyalty.setStampOpen(true)}
    >
      {loyalty.stampOpen && <StampCode loyalty={loyalty} />}
      {card.rewards.map((reward) => (
        <RewardRow balance={balance} key={reward.id} reward={reward} onRedeem={() => void loyalty.redeem(reward)} />
      ))}
    </QmLoyaltyCard>
  );
}

function StampCode({ loyalty }: { loyalty: LoyaltyController }) {
  const { t } = useTranslation();
  return (
    <QmCodeInput
      slot="stamp-panel"
      value={loyalty.code}
      status={loyalty.codeStatus}
      title={t("loyalty.code.title")}
      hint={t("loyalty.code.hint")}
      footnote={t("loyalty.code.footnote")}
      message={loyalty.codeMessage}
      inputLabel={t("loyalty.code.inputLabel")}
      disabled={loyalty.codeStatus === "throttled"}
      onQmInput={(event) => loyalty.setCode(event.detail.value)}
      onQmComplete={(event) => void loyalty.submitCode(event.detail.value)}
    />
  );
}

function RewardRow({ balance, onRedeem, reward }: { balance: number; onRedeem: () => void; reward: LoyaltyReward }) {
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
      stampsLabel={t("loyalty.reward.stamps")}
      remainingLabel={t("loyalty.reward.remaining", { count: remaining })}
      redeemLabel={t("loyalty.reward.redeem")}
      busyLabel={t("loyalty.reward.redeeming")}
      onQmRedeem={onRedeem}
    />
  );
}
