import { asc, desc, eq, max, sql } from "drizzle-orm";

import { messagingEvents } from "../schema/messaging";

import type { DrizzleDb } from "../client";

export type MessagingEvent = typeof messagingEvents.$inferSelect;
export type NewMessagingEvent = Omit<typeof messagingEvents.$inferInsert, "id" | "createdAt">;

export interface MessagingConversationSummary {
  conversationId: string;
  ref: string;
  lastEventAt: number;
  lastInboundAt: number | null;
}

/** Idempotent: the queue delivers at least once. */
export async function insertMessagingEvent({ db, event }: { db: DrizzleDb; event: NewMessagingEvent }) {
  await db
    .insert(messagingEvents)
    .values({ ...event, id: crypto.randomUUID() })
    .onConflictDoNothing();
}

export async function listMessagingConversations({ db }: { db: DrizzleDb }): Promise<MessagingConversationSummary[]> {
  return db
    .select({
      conversationId: messagingEvents.conversationId,
      ref: sql<string>`max(${messagingEvents.ref})`,
      lastEventAt: sql<number>`max(${messagingEvents.createdAt})`,
      lastInboundAt: sql<
        number | null
      >`max(case when ${messagingEvents.type} in ('text', 'button') then ${messagingEvents.createdAt} end)`,
    })
    .from(messagingEvents)
    .groupBy(messagingEvents.conversationId)
    .orderBy(desc(max(messagingEvents.createdAt)))
    .limit(50);
}

export async function listMessagingEvents({
  db,
  conversationId,
}: {
  db: DrizzleDb;
  conversationId: string;
}): Promise<MessagingEvent[]> {
  return db
    .select()
    .from(messagingEvents)
    .where(eq(messagingEvents.conversationId, conversationId))
    .orderBy(asc(messagingEvents.createdAt))
    .limit(200);
}
