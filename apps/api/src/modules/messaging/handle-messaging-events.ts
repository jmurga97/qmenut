import { createDb } from "@qmenut/db/client";
import { insertMessagingEvent } from "@qmenut/db/repositories/messaging-events.repository";
import { answerAttendanceCheck } from "@qmenut/db/repositories/reservations.repository";
import * as Sentry from "@sentry/cloudflare";
import { z } from "zod";

import { resolveNotifications } from "../notifications/emit-notification";
import { announceReservations, wasAccepted } from "../reservations/reservation-messages";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
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

const ATTENDANCE_ANSWERS = new Set(["confirm", "cancel"]);

/** The attendance check's quick replies; ref is the reservation id (the console's own ref matches none). */
async function applyAnswer({ db, env, event }: { db: DrizzleDb; env: RuntimeEnv; event: QueueEvent }) {
  if (event.type !== "button" || !ATTENDANCE_ANSWERS.has(event.buttonId)) return;

  const answer = event.buttonId as "confirm" | "cancel";
  const row = await answerAttendanceCheck({ db, reservationId: event.ref, answer });
  if (!row) return;

  if (answer === "confirm") {
    await resolveNotifications({
      db,
      type: "reservation.unconfirmed",
      subjectIds: [row.id],
      handledBy: null,
      outcome: "confirmed",
    });
    return;
  }

  // The same emails and notifications as a cancellation from /reservar.
  await announceReservations({
    db,
    env,
    reservationIds: [row.id],
    event: { kind: "cancelled", by: "guest", handledBy: null, wasAccepted: wasAccepted(row) },
  });
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
      // Redeliveries are harmless: the answer only applies while the reservation is in a status that takes it.
      await applyAnswer({ db, env, event });
      message.ack();
    } catch (error) {
      Sentry.captureException(error, { tags: { module: "messaging-events" } });
      message.retry({ delaySeconds: 30 });
    }
  }
}
