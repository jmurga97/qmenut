import {
  referralAudit,
  referralBatches,
  referralCampaigns,
  referralLeads,
  referralParticipants,
  referralRecipients,
} from "@qmenut/db/schema";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNotNull, isNull, like, or, sql } from "drizzle-orm";

import { requireCampaigns, unwrap } from "../referrals/referral-delivery";
import { auditEntry } from "../referrals/referral-domain";

import type { TrpcContext } from "../../trpc/context";
import type { SQL } from "drizzle-orm";

type Context = Pick<TrpcContext, "db" | "env"> & { staffEmail: string };

export const ENGAGEMENTS = ["not_invited", "invited", "sent", "clicked", "visited", "replied", "registered"] as const;
export type Engagement = (typeof ENGAGEMENTS)[number];

const PAGE_SIZE = 50;

/** Emails already imported, from one JSON parameter so a page of 2,000 stays under D1's bound-parameter limit. */
export async function findExistingLeads({ db, emails }: Pick<Context, "db"> & { emails: string[] }) {
  const rows = await db
    .select({ email: referralLeads.email })
    .from(referralLeads)
    .where(sql`${referralLeads.email} IN (SELECT value FROM json_each(${JSON.stringify(emails)}))`)
    .all();

  return { existing: rows.map((row) => row.email) };
}

export async function importLeads({
  db,
  staffEmail,
  label,
  leads,
}: Context & { label: string; leads: Array<{ email: string; name: string | null }> }) {
  // One INSERT … SELECT per page; duplicates of earlier imports are skipped by the unique email index.
  const result = await db.run(sql`
    INSERT INTO referral_leads (id, email, name, import_label)
    SELECT lower(hex(randomblob(16))), json_extract(value, '$.email'), json_extract(value, '$.name'), ${label}
    FROM json_each(${JSON.stringify(leads)}) WHERE true
    ON CONFLICT (email) DO NOTHING
  `);
  const inserted = result.meta.changes;
  await db.insert(referralAudit).values(
    auditEntry({
      entityType: "lead",
      entityId: label,
      action: "imported",
      actor: staffEmail,
      details: { inserted, received: leads.length },
    }),
  );

  return { inserted, skipped: leads.length - inserted };
}

function engagementFilter(engagement: Engagement): SQL | undefined {
  switch (engagement) {
    case "not_invited":
      return isNull(referralRecipients.id);
    case "invited":
      return and(isNotNull(referralRecipients.id), isNull(referralRecipients.sentAt));
    case "sent":
      return isNotNull(referralRecipients.sentAt);
    case "clicked":
      return isNotNull(referralRecipients.clickedAt);
    case "visited":
      return isNotNull(referralRecipients.firstVisitAt);
    case "replied":
      return isNotNull(referralRecipients.repliedAt);
    case "registered":
      return isNotNull(referralParticipants.id);
  }
}

interface ListInput {
  search: string;
  batchId: string | null;
  engagement: Engagement | null;
  status: "active" | "unsubscribed" | "bounced" | null;
  page: number;
}

export async function listLeads({ db, search, batchId, engagement, status, page }: Pick<Context, "db"> & ListInput) {
  const pattern = `%${search.toLowerCase()}%`;
  const where = and(
    search ? or(like(referralLeads.email, pattern), like(sql`lower(${referralLeads.name})`, pattern)) : undefined,
    batchId ? eq(referralRecipients.batchId, batchId) : undefined,
    engagement ? engagementFilter(engagement) : undefined,
    status ? eq(referralLeads.status, status) : undefined,
  );
  const from = () =>
    db
      .select({
        id: referralLeads.id,
        email: referralLeads.email,
        name: referralLeads.name,
        importLabel: referralLeads.importLabel,
        status: referralLeads.status,
        createdAt: referralLeads.createdAt,
        campaignName: referralCampaigns.name,
        batchPosition: referralBatches.position,
        rewardCents: referralRecipients.rewardCents,
        sentAt: referralRecipients.sentAt,
        clickedAt: referralRecipients.clickedAt,
        firstVisitAt: referralRecipients.firstVisitAt,
        repliedAt: referralRecipients.repliedAt,
        participantId: referralParticipants.id,
      })
      .from(referralLeads)
      .leftJoin(referralRecipients, eq(referralRecipients.leadId, referralLeads.id))
      .leftJoin(referralBatches, eq(referralBatches.id, referralRecipients.batchId))
      .leftJoin(referralCampaigns, eq(referralCampaigns.id, referralBatches.campaignId))
      .leftJoin(referralParticipants, eq(referralParticipants.email, referralLeads.email))
      .where(where);

  const [rows, total] = await Promise.all([
    from()
      // Newest import first, file order within it.
      .orderBy(desc(referralLeads.createdAt), sql`${referralLeads}.rowid`)
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE)
      .all(),
    db
      .select({ total: count() })
      .from(referralLeads)
      .leftJoin(referralRecipients, eq(referralRecipients.leadId, referralLeads.id))
      .leftJoin(referralParticipants, eq(referralParticipants.email, referralLeads.email))
      .where(where)
      .get(),
  ]);

  return { rows, total: total?.total ?? 0, pageSize: PAGE_SIZE };
}

/** Staff opt-out, one way: suppressed here and on Instantly's block list, so no batch or provider retry reaches them. */
export async function unsubscribeLead({ db, env, staffEmail, leadId }: Context & { leadId: string }) {
  const lead = await db.select().from(referralLeads).where(eq(referralLeads.id, leadId)).get();
  if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
  if (lead.status !== "active") return { ok: true };

  if (env.REFERRAL_DELIVERY === "live") {
    unwrap(await requireCampaigns(env).suppress({ productId: env.CAMPAIGN_PRODUCT_ID, emails: [lead.email] }));
  }
  await db.batch([
    db.update(referralLeads).set({ status: "unsubscribed", updatedAt: Date.now() }).where(eq(referralLeads.id, leadId)),
    db
      .insert(referralAudit)
      .values(auditEntry({ entityType: "lead", entityId: leadId, action: "unsubscribed", actor: staffEmail })),
  ]);

  return { ok: true };
}
