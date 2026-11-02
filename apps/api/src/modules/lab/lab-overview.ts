import { sql } from "drizzle-orm";

import type { TrpcContext } from "../../trpc/context";

interface DeliveryRow {
  rewardCents: number;
  invited: number;
  sent: number;
  clicked: number;
  visited: number;
}

interface ConversionRow {
  source: "invited" | "public";
  rewardCents: number;
  participants: number;
  referrals: number;
  approved: number;
  owedCents: number;
  paidCents: number;
  revenueCents: number;
}

const EMPTY_DELIVERY = { invited: 0, sent: 0, clicked: 0, visited: 0 };
const EMPTY_CONVERSION = { participants: 0, referrals: 0, approved: 0, owedCents: 0, paidCents: 0, revenueCents: 0 };

/** Funnel and reward-group comparison. Owed and paid come from the reward snapshots on each referral. */
export async function getOverview({ db }: Pick<TrpcContext, "db">) {
  const [delivery, conversion] = await Promise.all([
    db.all<DeliveryRow>(sql`
      SELECT reward_cents AS rewardCents, count(*) AS invited, count(sent_at) AS sent,
        count(clicked_at) AS clicked, count(first_visit_at) AS visited
      FROM referral_recipients GROUP BY reward_cents`),
    db.all<ConversionRow>(sql`
      SELECT CASE WHEN p.recipient_id IS NULL THEN 'public' ELSE 'invited' END AS source,
        p.reward_cents AS rewardCents,
        count(DISTINCT p.id) AS participants,
        count(r.id) AS referrals,
        coalesce(sum(r.status = 'approved'), 0) AS approved,
        coalesce(sum(CASE WHEN r.status = 'approved' AND r.payout_status = 'unpaid' THEN r.reward_cents END), 0) AS owedCents,
        coalesce(sum(CASE WHEN r.payout_status = 'paid' THEN r.reward_cents END), 0) AS paidCents,
        coalesce(sum(CASE WHEN r.status = 'approved' THEN r.payment_cents END), 0) AS revenueCents
      FROM referral_participants p LEFT JOIN referrals r ON r.participant_id = p.id
      GROUP BY source, p.reward_cents`),
  ]);

  const keys = new Set([
    ...delivery.map((row) => `invited:${row.rewardCents}`),
    ...conversion.map((row) => `${row.source}:${row.rewardCents}`),
  ]);
  const groups = [...keys]
    .map((key) => {
      const [source, cents] = key.split(":") as ["invited" | "public", string];
      const rewardCents = Number(cents);
      const sent = source === "invited" ? delivery.find((row) => row.rewardCents === rewardCents) : undefined;
      const converted = conversion.find((row) => row.source === source && row.rewardCents === rewardCents);

      return { source, rewardCents, ...EMPTY_DELIVERY, ...sent, ...EMPTY_CONVERSION, ...converted };
    })
    .toSorted((a, b) => a.source.localeCompare(b.source) || a.rewardCents - b.rewardCents);

  const total = (field: keyof typeof EMPTY_DELIVERY | keyof typeof EMPTY_CONVERSION) =>
    groups.reduce((sum, group) => sum + group[field], 0);

  return {
    funnel: {
      sent: total("sent"),
      visited: total("visited"),
      participants: total("participants"),
      referrals: total("referrals"),
      purchases: total("approved"),
    },
    providerClicks: total("clicked"),
    money: { owedCents: total("owedCents"), paidCents: total("paidCents"), revenueCents: total("revenueCents") },
    groups,
  };
}
