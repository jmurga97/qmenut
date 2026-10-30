import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const epochMilliseconds = sql`(unixepoch() * 1000)`;

/**
 * Events from the ming-msg-worker queue plus outbound replies sent from QMenut.
 * Conversation history lives here; the worker never stores message bodies.
 */
export const messagingEvents = sqliteTable(
  "messaging_events",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    ref: text("ref").notNull(),
    messageId: text("message_id").notNull(),
    direction: text("direction", { enum: ["in", "out"] }).notNull(),
    type: text("type").notNull(),
    // Empty string instead of NULL so the dedupe index also covers non-status events.
    status: text("status").notNull().default(""),
    buttonId: text("button_id"),
    text: text("text"),
    errorCode: text("error_code"),
    createdAt: integer("created_at").notNull().default(epochMilliseconds),
  },
  (table) => [
    uniqueIndex("messaging_events_dedupe_unique").on(table.messageId, table.type, table.status),
    index("messaging_events_conversation_idx").on(table.conversationId, table.createdAt),
    check("messaging_events_direction", sql`${table.direction} IN ('in', 'out')`),
  ],
);
