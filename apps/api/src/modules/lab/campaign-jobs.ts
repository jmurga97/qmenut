import { createDb } from "@qmenut/db/client";
import {
  referralAudit,
  referralBatches,
  referralCampaigns,
  referralRecipients,
  referralTokens,
} from "@qmenut/db/schema";
import * as Sentry from "@sentry/cloudflare";
import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";

import { launchNextScheduledBatch } from "./campaign-schedule";
import { offerUrl, requireCampaigns, unwrap } from "../referrals/referral-delivery";
import { auditEntry } from "../referrals/referral-domain";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

// Instantly's bulk endpoint takes up to 1,000; 500 keeps each call well inside its timeout.
const CHUNK_SIZE = 500;
const CHUNKS_PER_PASS = 6;
const LEASE_MS = 55_000;

interface PrepareInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  batchId: string;
}

async function markRecipients({
  db,
  ids,
  status,
  reason,
}: {
  db: DrizzleDb;
  ids: string[];
  status: "enrolled" | "failed";
  reason?: string;
}) {
  if (ids.length === 0) return;

  await db
    .update(referralRecipients)
    .set({ status, failureReason: reason ?? null })
    .where(sql`${referralRecipients.id} IN (SELECT value FROM json_each(${JSON.stringify(ids)}))`);
}

async function uploadNextChunk({
  db,
  env,
  batchId,
  providerCampaignId,
}: PrepareInput & { providerCampaignId: string }) {
  const chunk = await db
    .select({ id: referralRecipients.id, email: referralRecipients.email, name: referralRecipients.name })
    .from(referralRecipients)
    .where(and(eq(referralRecipients.batchId, batchId), eq(referralRecipients.status, "pending")))
    .orderBy(asc(referralRecipients.id))
    .limit(CHUNK_SIZE)
    .all();
  if (chunk.length === 0) return false;

  const { createdIndexes } = unwrap(
    await requireCampaigns(env).addLeads({
      productId: env.CAMPAIGN_PRODUCT_ID,
      campaignId: providerCampaignId,
      leads: chunk.map((row) => ({ ...row, recipientId: row.id, offerUrl: offerUrl(env, row.id) })),
    }),
  );
  const created = new Set(createdIndexes);
  await markRecipients({
    db,
    status: "enrolled",
    ids: chunk.filter((_, index) => created.has(index)).map((row) => row.id),
  });
  await markRecipients({
    db,
    status: "failed",
    reason: "Instantly no lo aceptó (lista de bloqueo, correo inválido o ya existente)",
    ids: chunk.filter((_, index) => !created.has(index)).map((row) => row.id),
  });

  return true;
}

async function prepareLive({ db, env, batchId }: PrepareInput) {
  const row = await db
    .select({ batch: referralBatches, campaignName: referralCampaigns.name })
    .from(referralBatches)
    .innerJoin(referralCampaigns, eq(referralCampaigns.id, referralBatches.campaignId))
    .where(eq(referralBatches.id, batchId))
    .get();
  if (!row) return;

  let providerCampaignId = row.batch.providerCampaignId;
  if (!providerCampaignId) {
    ({ campaignId: providerCampaignId } = unwrap(
      await requireCampaigns(env).createCampaign({
        productId: env.CAMPAIGN_PRODUCT_ID,
        name: `QMenut referidos · ${row.campaignName} · lote ${row.batch.position}`,
        rewardCents: row.batch.rewardCents,
        templateVersion: row.batch.templateVersion ?? 1,
      }),
    ));
    await db.update(referralBatches).set({ providerCampaignId }).where(eq(referralBatches.id, batchId));
  }

  for (let pass = 0; pass < CHUNKS_PER_PASS; pass += 1) {
    // A pause between chunks stops the upload at the next chunk boundary.
    const current = await db
      .select({ status: referralBatches.status })
      .from(referralBatches)
      .where(eq(referralBatches.id, batchId))
      .get();
    if (current?.status !== "preparing") return;
    if (!(await uploadNextChunk({ db, env, batchId, providerCampaignId }))) {
      unwrap(
        await requireCampaigns(env).setCampaignState({
          productId: env.CAMPAIGN_PRODUCT_ID,
          campaignId: providerCampaignId,
          state: "active",
        }),
      );
      const stillPreparing = and(eq(referralBatches.id, batchId), eq(referralBatches.status, "preparing"));
      await db.batch([
        db.update(referralBatches).set({ status: "sending", updatedAt: Date.now() }).where(stillPreparing),
        db
          .insert(referralAudit)
          .values(auditEntry({ entityType: "batch", entityId: batchId, action: "sending", actor: "system" })),
      ]);
      return;
    }
  }
}

/** Local and dev default: every recipient counts as sent at once, nothing leaves the Worker. */
async function prepareSimulated({ db, batchId }: Omit<PrepareInput, "env">) {
  const now = Date.now();
  const pending = and(eq(referralRecipients.batchId, batchId), eq(referralRecipients.status, "pending"));
  const preparing = and(eq(referralBatches.id, batchId), eq(referralBatches.status, "preparing"));
  await db.batch([
    db.update(referralRecipients).set({ status: "enrolled", sentAt: now }).where(pending),
    db
      .update(referralBatches)
      .set({ status: "completed", providerCampaignId: "simulated", updatedAt: now })
      .where(preparing),
    db
      .insert(referralAudit)
      .values(auditEntry({ entityType: "batch", entityId: batchId, action: "simulated", actor: "system" })),
  ]);
}

/**
 * One resumable pass: suppression, Instantly campaign, chunked uploads, activation. Progress lives
 * in each recipient's status, so an interrupted pass continues from the next pending recipient.
 */
export async function prepareBatch({ db, env, batchId }: PrepareInput): Promise<void> {
  const now = Date.now();
  const leaseFree = or(isNull(referralBatches.leaseUntil), lt(referralBatches.leaseUntil, now));
  const leased = await db
    .update(referralBatches)
    .set({ leaseUntil: now + LEASE_MS })
    .where(and(eq(referralBatches.id, batchId), eq(referralBatches.status, "preparing"), leaseFree))
    .returning({ id: referralBatches.id })
    .get();
  if (!leased) return;

  try {
    // Suppression before enrollment: opt-outs and bounces since launch never reach Instantly.
    await db.run(sql`
      UPDATE referral_recipients
      SET status = 'skipped', failure_reason = (SELECT l.status FROM referral_leads l WHERE l.id = referral_recipients.lead_id)
      WHERE batch_id = ${batchId} AND status = 'pending'
        AND lead_id IN (SELECT id FROM referral_leads WHERE status <> 'active')`);

    await (env.REFERRAL_DELIVERY === "simulate"
      ? prepareSimulated({ db, batchId })
      : prepareLive({ db, env, batchId }));
    await db.update(referralBatches).set({ lastError: null }).where(eq(referralBatches.id, batchId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(referralBatches)
      .set({ lastError: message.slice(0, 500) })
      .where(eq(referralBatches.id, batchId));
    Sentry.captureException(error, { tags: { module: "referral-campaign-jobs" } });
  } finally {
    await db.update(referralBatches).set({ leaseUntil: null }).where(eq(referralBatches.id, batchId));
  }
}

/** Minute cron: continues every batch in preparation and drops expired referral links and sessions. */
export async function runReferralJobs(env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);
  try {
    await launchNextScheduledBatch({ db });
    const batches = await db
      .select({ id: referralBatches.id })
      .from(referralBatches)
      .where(eq(referralBatches.status, "preparing"))
      .all();
    for (const batch of batches) await prepareBatch({ db, env, batchId: batch.id });
    await db.delete(referralTokens).where(lt(referralTokens.expiresAt, Date.now()));
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "referral-campaign-jobs" } });
  }
}
