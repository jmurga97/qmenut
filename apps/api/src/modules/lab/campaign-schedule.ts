import { referralAudit, referralBatches, referralCampaigns, referralLeads } from "@qmenut/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { countEligibleLeads, freezeBatch } from "./campaign-audience";
import { MAX_CAMPAIGN_RECIPIENTS, REFERRAL_TEMPLATE_VERSION, auditEntry } from "../referrals/referral-domain";

import type { TrpcContext } from "../../trpc/context";
import type { DrizzleDb } from "@qmenut/db/client";

export const DAILY_BATCH_SIZE = 150;
export const DAILY_REWARD_CENTS = 3000;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const PENDING = ["draft", "paused"] as const;
type Context = Pick<TrpcContext, "db"> & { staffEmail: string };

/** Caracas is UTC−04:00. Starting a plan never sends immediately; the first slot is the next 09:00. */
export function firstDailySendAt(now: number): number {
  const today = Math.floor((now - 4 * HOUR_MS) / DAY_MS) * DAY_MS + 13 * HOUR_MS;
  return today > now ? today : today + DAY_MS;
}

async function activeSchedule(db: DrizzleDb) {
  return db
    .select()
    .from(referralCampaigns)
    .where(sql`${referralCampaigns.dailyLimit} = ${DAILY_BATCH_SIZE} AND EXISTS (
      SELECT 1 FROM referral_batches b WHERE b.campaign_id = ${referralCampaigns.id}
        AND b.scheduled_at IS NOT NULL AND b.status IN ('draft', 'paused', 'preparing', 'sending'))`)
    .orderBy(desc(referralCampaigns.createdAt))
    .get();
}

export async function getDailySchedule({ db }: Pick<Context, "db">) {
  const campaign = await activeSchedule(db);
  const latestImport = await db.get<{ label: string }>(sql`
    SELECT import_label AS label FROM referral_leads WHERE import_label IS NOT NULL ORDER BY rowid DESC LIMIT 1`);
  const source = campaign?.importLabel ?? latestImport?.label ?? null;
  const sourceWhere = source ? eq(referralLeads.importLabel, source) : undefined;
  const upcomingWhere = campaign
    ? and(eq(referralBatches.campaignId, campaign.id), inArray(referralBatches.status, PENDING))
    : undefined;
  const [sourceCount, eligible, upcoming, progress] = await Promise.all([
    db.select({ total: count() }).from(referralLeads).where(sourceWhere).get(),
    countEligibleLeads(db, source),
    campaign
      ? db.select().from(referralBatches).where(upcomingWhere).orderBy(asc(referralBatches.scheduledAt)).limit(7).all()
      : [],
    campaign
      ? db.get<{
          planned: number;
          paused: number;
          batches: number;
          completed: number;
          sent: number;
          lastAt: number | null;
        }>(sql`
      SELECT coalesce(sum(CASE WHEN b.status IN ('draft','paused') THEN b.size ELSE 0 END),0) AS planned,
        coalesce(sum(b.status = 'paused' AND b.launched_at IS NULL),0) AS paused, count(*) AS batches,
        coalesce(sum(b.status = 'completed'),0) AS completed, max(b.scheduled_at) AS lastAt,
        (SELECT count(*) FROM referral_recipients r JOIN referral_batches rb ON rb.id = r.batch_id
          WHERE rb.campaign_id = ${campaign.id} AND r.sent_at IS NOT NULL) AS sent
      FROM referral_batches b WHERE b.campaign_id = ${campaign.id}`)
      : null,
  ]);

  return {
    campaign: campaign ?? null,
    source,
    total: sourceCount?.total ?? 0,
    eligible,
    dailyLimit: DAILY_BATCH_SIZE,
    rewardCents: DAILY_REWARD_CENTS,
    firstAt: upcoming[0]?.scheduledAt ?? firstDailySendAt(Date.now()),
    lastAt:
      progress?.lastAt ??
      firstDailySendAt(Date.now()) + Math.max(0, Math.ceil(eligible / DAILY_BATCH_SIZE) - 1) * DAY_MS,
    upcoming,
    planned: progress?.planned ?? 0,
    paused: progress?.paused ?? 0,
    batches: progress?.batches ?? Math.ceil(eligible / DAILY_BATCH_SIZE),
    completed: progress?.completed ?? 0,
    sent: progress?.sent ?? 0,
  };
}

/** All dates are committed together. Repeated/concurrent clicks reuse the active plan. */
export async function startDailySchedule({ db, staffEmail }: Context) {
  const current = await getDailySchedule({ db });
  if (current.campaign) return { id: current.campaign.id };
  if (current.eligible === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Importa contactos activos sin invitar antes de programar.",
    });
  }
  const id = crypto.randomUUID();
  const total = Math.min(current.eligible, MAX_CAMPAIGN_RECIPIENTS);
  const firstAt = firstDailySendAt(Date.now());
  const slots = Array.from({ length: Math.ceil(total / DAILY_BATCH_SIZE) }, (_, index) => ({
    id: crypto.randomUUID(),
    position: index + 1,
    size: Math.min(DAILY_BATCH_SIZE, total - index * DAILY_BATCH_SIZE),
    scheduledAt: firstAt + index * DAY_MS,
  }));
  const d1 = db.$client;
  await d1.batch([
    d1
      .prepare(`INSERT INTO referral_campaigns (id,name,import_label,daily_limit,created_by)
      SELECT ?1, 'Referidos · 150 diarios', ?2, ?3, ?4
      WHERE NOT EXISTS (SELECT 1 FROM referral_batches b JOIN referral_campaigns c ON c.id = b.campaign_id
        WHERE c.daily_limit IS NOT NULL AND b.status IN ('draft','paused','preparing','sending'))`)
      .bind(id, current.source, DAILY_BATCH_SIZE, staffEmail),
    d1
      .prepare(`INSERT INTO referral_batches
      (id,campaign_id,position,size,reward_cents,template_version,scheduled_at)
      SELECT json_extract(value,'$.id'), ?1, json_extract(value,'$.position'), json_extract(value,'$.size'), ?2, ?3,
        json_extract(value,'$.scheduledAt') FROM json_each(?4)
      WHERE EXISTS (SELECT 1 FROM referral_campaigns WHERE id = ?1)`)
      .bind(id, DAILY_REWARD_CENTS, REFERRAL_TEMPLATE_VERSION, JSON.stringify(slots)),
  ]);
  const started = await activeSchedule(db);
  if (!started) throw new TRPCError({ code: "CONFLICT", message: "No se pudo programar. Vuelve a intentarlo." });
  if (started.id === id) {
    await db.insert(referralAudit).values(
      auditEntry({
        entityType: "campaign",
        entityId: id,
        action: "scheduled",
        actor: staffEmail,
        details: { dailyLimit: DAILY_BATCH_SIZE, total, firstAt, source: current.source },
      }),
    );
  }

  return { id: started.id };
}

async function moveRemainingDates({ db, campaignId, firstAt }: { db: DrizzleDb; campaignId: string; firstAt: number }) {
  await db.run(sql`WITH dates AS (
    SELECT id, row_number() OVER (ORDER BY position) - 1 AS offset FROM referral_batches
    WHERE campaign_id = ${campaignId} AND status = 'draft' AND scheduled_at IS NOT NULL AND launched_at IS NULL
  ) UPDATE referral_batches SET scheduled_at = ${firstAt} + ${DAY_MS} * (SELECT offset FROM dates WHERE dates.id = referral_batches.id)
    WHERE id IN (SELECT id FROM dates)`);
}

export async function setDailySchedulePaused({ db, staffEmail, paused }: Context & { paused: boolean }) {
  const campaign = await activeSchedule(db);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "No hay una programación activa." });
  await db
    .update(referralBatches)
    .set({ status: paused ? "paused" : "draft", updatedAt: Date.now() })
    .where(
      and(
        eq(referralBatches.campaignId, campaign.id),
        eq(referralBatches.status, paused ? "draft" : "paused"),
        sql`${referralBatches.launchedAt} IS NULL`,
        isNotNull(referralBatches.scheduledAt),
      ),
    );
  if (!paused) await moveRemainingDates({ db, campaignId: campaign.id, firstAt: firstDailySendAt(Date.now()) });
  await db.insert(referralAudit).values(
    auditEntry({
      entityType: "campaign",
      entityId: campaign.id,
      action: paused ? "schedule_paused" : "schedule_resumed",
      actor: staffEmail,
    }),
  );

  return { ok: true };
}

/** Missed days never create a catch-up burst: one 150-contact batch per Caracas day, including weekends. */
export async function launchNextScheduledBatch({ db, now = Date.now() }: { db: DrizzleDb; now?: number }) {
  const utcHour = new Date(now).getUTCHours();
  if (utcHour < 13 || utcHour >= 22) return;
  const due = await db
    .select()
    .from(referralBatches)
    .where(and(eq(referralBatches.status, "draft"), sql`${referralBatches.scheduledAt} <= ${now}`))
    .orderBy(asc(referralBatches.scheduledAt))
    .get();
  if (!due) return;
  try {
    const frozen = await freezeBatch({ db, batchId: due.id, staffEmail: "system", now });
    if (frozen.recipientCount === 0) {
      await db
        .update(referralBatches)
        .set({ status: "completed", updatedAt: now })
        .where(
          and(
            eq(referralBatches.campaignId, due.campaignId),
            eq(referralBatches.status, "draft"),
            isNotNull(referralBatches.scheduledAt),
          ),
        );
    }
    await moveRemainingDates({ db, campaignId: due.campaignId, firstAt: firstDailySendAt(now) });
    await db.insert(referralAudit).values(
      auditEntry({
        entityType: "batch",
        entityId: due.id,
        action: "launched",
        actor: "system",
        details: frozen,
      }),
    );
  } catch (error) {
    if (error instanceof TRPCError && error.code === "CONFLICT") return;
    throw error;
  }
}
