import { referralAudit, referralBatches, referralCampaigns, referralRecipients } from "@qmenut/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

import { countEligibleLeads, freezeBatch } from "./campaign-audience";
import { prepareBatch } from "./campaign-jobs";
import { requireCampaigns, unwrap } from "../referrals/referral-delivery";
import {
  MAX_CAMPAIGN_RECIPIENTS,
  REFERRAL_TEMPLATE_VERSION,
  auditEntry,
  defaultBatch,
  listAudit,
} from "../referrals/referral-domain";

import type { TrpcContext } from "../../trpc/context";

type Context = Pick<TrpcContext, "db" | "env"> & { staffEmail: string };
type Db = Context["db"];

/** Delivery and conversion counts per batch. */
async function batchStats(db: Db, batchIds: string[]) {
  if (batchIds.length === 0) return new Map<string, BatchStats>();

  const ids = JSON.stringify(batchIds);
  const rows = await db.all<BatchStats & { batchId: string }>(sql`
    SELECT r.batch_id AS batchId,
      sum(r.status = 'pending') AS pending,
      sum(r.status = 'enrolled') AS enrolled,
      sum(r.status IN ('skipped', 'failed')) AS failed,
      count(r.sent_at) AS sent,
      count(r.clicked_at) AS clicked,
      count(r.first_visit_at) AS visited,
      count(r.replied_at) AS replied,
      count(r.bounced_at) AS bounced,
      count(r.unsubscribed_at) AS unsubscribed,
      count(p.id) AS registered,
      coalesce(sum(f.referrals), 0) AS referrals,
      coalesce(sum(f.approved), 0) AS approved
    FROM referral_recipients r
    LEFT JOIN referral_participants p ON p.recipient_id = r.id
    LEFT JOIN (
      SELECT participant_id, count(*) AS referrals, sum(status = 'approved') AS approved
      FROM referrals GROUP BY participant_id
    ) f ON f.participant_id = p.id
    WHERE r.batch_id IN (SELECT value FROM json_each(${ids}))
    GROUP BY r.batch_id`);

  return new Map(rows.map(({ batchId, ...stats }) => [batchId, stats]));
}

export interface BatchStats {
  pending: number;
  enrolled: number;
  failed: number;
  sent: number;
  clicked: number;
  visited: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  registered: number;
  referrals: number;
  approved: number;
}

async function listBatches(db: Db, campaignIds: string[]) {
  const batches = await db
    .select()
    .from(referralBatches)
    .where(inArray(referralBatches.campaignId, campaignIds))
    .orderBy(asc(referralBatches.position))
    .all();
  const stats = await batchStats(
    db,
    batches.map((batch) => batch.id),
  );

  return batches.map((batch) => ({ ...batch, stats: stats.get(batch.id) ?? null }));
}

export async function listCampaigns({ db }: Pick<Context, "db">) {
  const campaigns = await db.select().from(referralCampaigns).orderBy(desc(referralCampaigns.createdAt)).all();
  const batches = await listBatches(
    db,
    campaigns.map((campaign) => campaign.id),
  );

  return campaigns.map((campaign) => ({
    ...campaign,
    batches: batches.filter((batch) => batch.campaignId === campaign.id),
  }));
}

export async function createCampaign({ db, staffEmail, name }: Context & { name: string }) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(referralCampaigns).values({ id, name, createdBy: staffEmail }),
    db
      .insert(referralAudit)
      .values(auditEntry({ entityType: "campaign", entityId: id, action: "created", actor: staffEmail })),
  ]);

  return { id };
}

export async function getCampaign({ db, campaignId }: Pick<Context, "db"> & { campaignId: string }) {
  const campaign = await db.select().from(referralCampaigns).where(eq(referralCampaigns.id, campaignId)).get();
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });

  const batches = await listBatches(db, [campaignId]);
  const assigned = batches.reduce((sum, batch) => sum + batch.size, 0);

  return {
    campaign,
    batches,
    assigned,
    maxRecipients: MAX_CAMPAIGN_RECIPIENTS,
    nextBatch: defaultBatch({ assigned }),
    eligibleLeads: await countEligibleLeads(db),
  };
}

export async function createBatch({
  db,
  staffEmail,
  campaignId,
  size,
  rewardCents,
}: Context & { campaignId: string; size: number; rewardCents: number }) {
  const { batches, assigned } = await getCampaign({ db, campaignId });
  if (assigned + size > MAX_CAMPAIGN_RECIPIENTS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `La campaña no puede pasar de ${MAX_CAMPAIGN_RECIPIENTS} destinatarios.`,
    });
  }

  const id = crypto.randomUUID();
  const position = Math.max(0, ...batches.map((batch) => batch.position)) + 1;
  await db.batch([
    db.insert(referralBatches).values({ id, campaignId, position, size, rewardCents }),
    db.insert(referralAudit).values(
      auditEntry({
        entityType: "batch",
        entityId: id,
        action: "created",
        actor: staffEmail,
        details: { size, rewardCents },
      }),
    ),
  ]);

  return { id };
}

async function loadBatch(db: Db, batchId: string) {
  const row = await db
    .select({
      batch: referralBatches,
      campaignName: referralCampaigns.name,
      importLabel: referralCampaigns.importLabel,
    })
    .from(referralBatches)
    .innerJoin(referralCampaigns, eq(referralCampaigns.id, referralBatches.campaignId))
    .where(eq(referralBatches.id, batchId))
    .get();
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });

  return row;
}

export async function deleteDraftBatch({ db, staffEmail, batchId }: Context & { batchId: string }) {
  const deleted = await db
    .delete(referralBatches)
    .where(
      and(
        eq(referralBatches.id, batchId),
        eq(referralBatches.status, "draft"),
        sql`${referralBatches.scheduledAt} IS NULL`,
      ),
    )
    .returning({ id: referralBatches.id })
    .get();
  if (!deleted) throw new TRPCError({ code: "CONFLICT", message: "Solo se pueden eliminar lotes en borrador." });

  await db
    .insert(referralAudit)
    .values(auditEntry({ entityType: "batch", entityId: batchId, action: "deleted", actor: staffEmail }));

  return { ok: true };
}

export async function getBatch({ db, batchId }: Pick<Context, "db"> & { batchId: string }) {
  const { batch, campaignName, importLabel } = await loadBatch(db, batchId);
  const undelivered = or(
    inArray(referralRecipients.status, ["skipped", "failed"]),
    isNotNull(referralRecipients.bouncedAt),
    isNotNull(referralRecipients.unsubscribedAt),
  );
  const undeliveredHere = and(eq(referralRecipients.batchId, batchId), undelivered);
  const [stats, failures, history] = await Promise.all([
    batchStats(db, [batchId]),
    db
      .select({
        id: referralRecipients.id,
        email: referralRecipients.email,
        status: referralRecipients.status,
        failureReason: referralRecipients.failureReason,
        bouncedAt: referralRecipients.bouncedAt,
        unsubscribedAt: referralRecipients.unsubscribedAt,
      })
      .from(referralRecipients)
      .where(undeliveredHere)
      .limit(200)
      .all(),
    listAudit({ db, entityType: "batch", entityId: batchId }),
  ]);

  return {
    batch,
    campaignName,
    stats: stats.get(batchId) ?? null,
    failures,
    history,
    eligibleLeads: batch.status === "draft" ? await countEligibleLeads(db, importLabel) : null,
  };
}

function offerOf(env: Context["env"], batch: typeof referralBatches.$inferSelect) {
  return {
    productId: env.CAMPAIGN_PRODUCT_ID,
    rewardCents: batch.rewardCents,
    templateVersion: batch.templateVersion ?? REFERRAL_TEMPLATE_VERSION,
  };
}

export async function previewBatch({ db, env, batchId }: Context & { batchId: string }) {
  const { batch } = await loadBatch(db, batchId);

  return unwrap(await requireCampaigns(env).preview(offerOf(env, batch)));
}

export async function sendBatchTest({ db, env, staffEmail, batchId }: Context & { batchId: string }) {
  const { batch } = await loadBatch(db, batchId);
  const url = `${env.REFERRALS_APP_URL}/`;
  if (env.REFERRAL_DELIVERY === "simulate") {
    console.log("[referrals] simulated test email", { batchId, url });
  } else {
    unwrap(await requireCampaigns(env).sendTest({ ...offerOf(env, batch), to: staffEmail, offerUrl: url }));
  }
  await db
    .insert(referralAudit)
    .values(auditEntry({ entityType: "batch", entityId: batchId, action: "test_sent", actor: staffEmail }));

  return { to: staffEmail, simulated: env.REFERRAL_DELIVERY === "simulate" };
}

/**
 * Freezes audience, reward and template: one INSERT … SELECT picks the unassigned eligible leads in
 * import order (rowid), guarded on the batch still being a draft, and the batch leaves draft in the
 * same transaction.
 */
export async function launchBatch({ db, env, staffEmail, batchId }: Context & { batchId: string }) {
  const { batch } = await loadBatch(db, batchId);
  if (batch.status !== "draft") throw new TRPCError({ code: "CONFLICT", message: "Este lote ya se lanzó." });
  if ((await countEligibleLeads(db)) === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "No quedan contactos sin invitar. Importa más contactos.",
    });
  }

  const frozen = await freezeBatch({ db, batchId, staffEmail });
  await db
    .insert(referralAudit)
    .values(
      auditEntry({ entityType: "batch", entityId: batchId, action: "launched", actor: staffEmail, details: frozen }),
    );

  // First preparation pass now; the minute cron resumes it if it does not finish.
  await prepareBatch({ db, env, batchId });

  return { recipientCount: frozen.recipientCount };
}

export async function pauseBatch({ db, env, staffEmail, batchId }: Context & { batchId: string }) {
  const { batch } = await loadBatch(db, batchId);
  if (batch.scheduledAt && batch.status === "draft") {
    await db
      .update(referralBatches)
      .set({ status: "paused", updatedAt: Date.now() })
      .where(eq(referralBatches.id, batchId));
    return { ok: true };
  }
  if (batch.status !== "preparing" && batch.status !== "sending") {
    throw new TRPCError({ code: "CONFLICT", message: "Solo se puede pausar un lote en preparación o enviando." });
  }
  if (batch.status === "sending" && batch.providerCampaignId && env.REFERRAL_DELIVERY === "live") {
    unwrap(
      await requireCampaigns(env).setCampaignState({
        productId: env.CAMPAIGN_PRODUCT_ID,
        campaignId: batch.providerCampaignId,
        state: "paused",
      }),
    );
  }
  await db.batch([
    db.update(referralBatches).set({ status: "paused", updatedAt: Date.now() }).where(eq(referralBatches.id, batchId)),
    db
      .insert(referralAudit)
      .values(auditEntry({ entityType: "batch", entityId: batchId, action: "paused", actor: staffEmail })),
  ]);

  return { ok: true };
}

/** Back to preparation while recipients remain to upload; otherwise reactivates the Instantly campaign. */
export async function resumeBatch({ db, env, staffEmail, batchId }: Context & { batchId: string }) {
  const { batch } = await loadBatch(db, batchId);
  if (batch.status !== "paused") throw new TRPCError({ code: "CONFLICT", message: "El lote no está en pausa." });

  if (batch.scheduledAt && batch.launchedAt === null) {
    await db
      .update(referralBatches)
      .set({ status: "draft", updatedAt: Date.now() })
      .where(eq(referralBatches.id, batchId));
    return { ok: true };
  }

  const pending = await db
    .select({ id: referralRecipients.id })
    .from(referralRecipients)
    .where(and(eq(referralRecipients.batchId, batchId), eq(referralRecipients.status, "pending")))
    .get();
  if (!pending && batch.providerCampaignId && env.REFERRAL_DELIVERY === "live") {
    unwrap(
      await requireCampaigns(env).setCampaignState({
        productId: env.CAMPAIGN_PRODUCT_ID,
        campaignId: batch.providerCampaignId,
        state: "active",
      }),
    );
  }
  const status = pending || !batch.providerCampaignId ? "preparing" : "sending";
  await db.batch([
    db
      .update(referralBatches)
      .set({ status, leaseUntil: null, updatedAt: Date.now() })
      .where(eq(referralBatches.id, batchId)),
    db
      .insert(referralAudit)
      .values(auditEntry({ entityType: "batch", entityId: batchId, action: "resumed", actor: staffEmail })),
  ]);
  if (status === "preparing") await prepareBatch({ db, env, batchId });

  return { ok: true };
}
