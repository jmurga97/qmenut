import { referralBatches, referralCampaigns } from "@qmenut/db/schema";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";

import { REFERRAL_TEMPLATE_VERSION } from "../referrals/referral-domain";

import type { DrizzleDb } from "@qmenut/db/client";

export const ELIGIBLE_LEADS = `
  FROM referral_leads l
  WHERE l.status = 'active'
    AND NOT EXISTS (SELECT 1 FROM referral_recipients r WHERE r.lead_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM referral_participants p WHERE p.email = l.email)`;

export async function countEligibleLeads(db: DrizzleDb, importLabel: string | null = null): Promise<number> {
  const row = await db.get<{ total: number }>(sql`
    SELECT count(*) AS total ${sql.raw(ELIGIBLE_LEADS)}
      AND (${importLabel} IS NULL OR l.import_label = ${importLabel})`);

  return row?.total ?? 0;
}

/** D1's transaction freezes an audience only once, and admits at most one scheduled batch per Caracas day. */
export async function freezeBatch({
  db,
  batchId,
  staffEmail,
  now = Date.now(),
}: {
  db: DrizzleDb;
  batchId: string;
  staffEmail: string;
  now?: number;
}) {
  const row = await db
    .select({ batch: referralBatches, importLabel: referralCampaigns.importLabel })
    .from(referralBatches)
    .innerJoin(referralCampaigns, eq(referralCampaigns.id, referralBatches.campaignId))
    .where(eq(referralBatches.id, batchId))
    .get();
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  const { batch, importLabel } = row;
  const version = batch.templateVersion ?? REFERRAL_TEMPLATE_VERSION;
  const dayStart = Math.floor((now - 4 * 3_600_000) / 86_400_000) * 86_400_000 + 4 * 3_600_000;
  const ready = `b.status = 'draft' AND (b.scheduled_at IS NULL OR (
    b.scheduled_at <= ? AND NOT EXISTS (
      SELECT 1 FROM referral_batches sent WHERE sent.scheduled_at IS NOT NULL AND sent.launched_at >= ?
    )))`;
  const d1 = db.$client;
  const [, launched] = await d1.batch<{ recipient_count: number }>([
    d1
      .prepare(`INSERT INTO referral_recipients (id, batch_id, lead_id, email, name, reward_cents, template_version)
      SELECT lower(hex(randomblob(16))), ?, l.id, l.email, l.name, ?, ?
      ${ELIGIBLE_LEADS} AND (? IS NULL OR l.import_label = ?)
        AND EXISTS (SELECT 1 FROM referral_batches b WHERE b.id = ? AND ${ready})
      ORDER BY l.rowid LIMIT ?`)
      .bind(batchId, batch.rewardCents, version, importLabel, importLabel, batchId, now, dayStart, batch.size),
    d1
      .prepare(`UPDATE referral_batches AS b
      SET status = CASE WHEN EXISTS (SELECT 1 FROM referral_recipients WHERE batch_id = ?) THEN 'preparing' ELSE 'completed' END,
        template_version = ?, launched_at = ?, launched_by = ?, updated_at = ?,
        recipient_count = (SELECT count(*) FROM referral_recipients WHERE batch_id = ?)
      WHERE b.id = ? AND ${ready}
      RETURNING recipient_count`)
      .bind(batchId, version, now, staffEmail, now, batchId, batchId, now, dayStart),
  ]);
  const recipientCount = launched?.results[0]?.recipient_count;
  if (recipientCount === undefined) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "El lote ya se lanzó, está pausado o aún no le corresponde enviar.",
    });
  }

  return { recipientCount, templateVersion: version, rewardCents: batch.rewardCents };
}
