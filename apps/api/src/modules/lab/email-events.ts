import { createDb } from "@qmenut/db/client";
import { referralBatches, referralEmailEvents, referralLeads, referralRecipients } from "@qmenut/db/schema";
import * as Sentry from "@sentry/cloudflare";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

/** ming-email-worker queue message (README "Campaign events"). `id` is stable across Instantly retries. */
const eventSchema = z.object({
  v: z.literal(1),
  id: z.string().min(1),
  type: z.string().min(1),
  campaignId: z.string().nullable(),
  email: z.string().nullable(),
  recipientId: z.string().nullable(),
  at: z.number(),
});

type EmailEvent = z.infer<typeof eventSchema>;

// First occurrence wins: retries and repeated opens never move a timestamp.
const FIRST = {
  email_sent: "sentAt",
  link_clicked: "clickedAt",
  reply_received: "repliedAt",
  email_bounced: "bouncedAt",
  lead_unsubscribed: "unsubscribedAt",
} as const;

async function findRecipient(db: DrizzleDb, event: EmailEvent) {
  if (event.recipientId) {
    const row = await db
      .select({ id: referralRecipients.id, leadId: referralRecipients.leadId })
      .from(referralRecipients)
      .where(eq(referralRecipients.id, event.recipientId))
      .get();
    if (row) return row;
  }
  if (!event.campaignId || !event.email) return;

  const email = event.email.toLowerCase();
  return db
    .select({ id: referralRecipients.id, leadId: referralRecipients.leadId })
    .from(referralRecipients)
    .innerJoin(referralBatches, eq(referralBatches.id, referralRecipients.batchId))
    .where(and(eq(referralBatches.providerCampaignId, event.campaignId), eq(referralRecipients.email, email)))
    .get();
}

/** Every effect is idempotent, so a redelivered event changes nothing; the event row is the deduplicated log. */
async function applyEvent(db: DrizzleDb, event: EmailEvent): Promise<void> {
  const recipient = await findRecipient(db, event);
  const column = Object.hasOwn(FIRST, event.type) ? FIRST[event.type as keyof typeof FIRST] : null;

  if (event.type === "campaign_completed" && event.campaignId) {
    await db
      .update(referralBatches)
      .set({ status: "completed", updatedAt: Date.now() })
      .where(and(eq(referralBatches.providerCampaignId, event.campaignId), eq(referralBatches.status, "sending")));
  }
  if (recipient && column) {
    await db
      .update(referralRecipients)
      .set({ [column]: sql`coalesce(${referralRecipients[column]}, ${event.at})` })
      .where(eq(referralRecipients.id, recipient.id));
  }
  // Opt-outs and bounces suppress the lead for every future batch.
  if (recipient && (event.type === "email_bounced" || event.type === "lead_unsubscribed")) {
    await db
      .update(referralLeads)
      .set({ status: event.type === "email_bounced" ? "bounced" : "unsubscribed", updatedAt: Date.now() })
      .where(and(eq(referralLeads.id, recipient.leadId), eq(referralLeads.status, "active")));
  }

  await db
    .insert(referralEmailEvents)
    .values({
      id: event.id,
      type: event.type,
      recipientId: recipient?.id ?? null,
      providerCampaignId: event.campaignId,
      occurredAt: event.at,
    })
    .onConflictDoNothing();
}

export async function handleEmailEvents(batch: MessageBatch<unknown>, env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);

  for (const message of batch.messages) {
    const parsed = eventSchema.safeParse(message.body);
    if (!parsed.success) {
      Sentry.captureMessage("Evento de correo con formato desconocido", { tags: { module: "referral-email-events" } });
      message.ack();
      continue;
    }
    try {
      await applyEvent(db, parsed.data);
      message.ack();
    } catch (error) {
      Sentry.captureException(error, { tags: { module: "referral-email-events" } });
      message.retry();
    }
  }
}
