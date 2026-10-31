import { createDb } from "@qmenut/db/client";
import { insertMessagingEvent } from "@qmenut/db/repositories/messaging-events.repository";
import * as Sentry from "@sentry/cloudflare";
import { z } from "zod";

import type { RuntimeEnv } from "../../config/env/schema";
import type { NewMessagingEvent } from "@qmenut/db/repositories/messaging-events.repository";

// Contract v1 of ming-msg-worker queue events.
const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("status"),
    status: z.enum(["sent", "delivered", "read", "failed"]),
    errorCode: z.string().nullable(),
  }),
  z.object({ type: z.literal("button"), buttonId: z.string() }),
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("unsupported"), kind: z.string() }),
  z.object({ type: z.literal("opted_out") }),
]);

const envelopeSchema = z.object({
  v: z.literal(1),
  conversationId: z.string(),
  ref: z.string(),
  messageId: z.string(),
});

type QueueEvent = z.infer<typeof envelopeSchema> & z.infer<typeof eventSchema>;

function parseEvent(body: unknown): QueueEvent | null {
  const envelope = envelopeSchema.safeParse(body);
  const event = eventSchema.safeParse(body);
  return envelope.success && event.success ? { ...envelope.data, ...event.data } : null;
}

function toRow(event: QueueEvent): NewMessagingEvent {
  const base = { conversationId: event.conversationId, ref: event.ref, messageId: event.messageId, type: event.type };

  switch (event.type) {
    case "status":
      return { ...base, direction: "out", status: event.status, errorCode: event.errorCode };
    case "button":
      return { ...base, direction: "in", buttonId: event.buttonId };
    case "text":
      return { ...base, direction: "in", text: event.text };
    case "unsupported":
      return { ...base, direction: "in", text: event.kind };
    case "opted_out":
      return { ...base, direction: "in" };
  }
}

export async function handleMessagingEvents(batch: MessageBatch, env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);

  for (const message of batch.messages) {
    const event = parseEvent(message.body);

    if (!event) {
      Sentry.captureMessage("Evento de mensajería no válido", { tags: { module: "messaging-events" } });
      message.ack();
      continue;
    }

    try {
      await insertMessagingEvent({ db, event: toRow(event) });
      message.ack();
    } catch (error) {
      Sentry.captureException(error, { tags: { module: "messaging-events" } });
      message.retry({ delaySeconds: 30 });
    }
  }
}
