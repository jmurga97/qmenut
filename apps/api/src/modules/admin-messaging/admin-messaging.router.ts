import {
  insertMessagingEvent,
  listMessagingConversations,
  listMessagingEvents,
} from "@qmenut/db/repositories/messaging-events.repository";
import { isInternalSupportEmail } from "@qmenut/permissions";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../../trpc/trpc";
import { replyText, sendTemplate } from "../messaging/msg-worker.client";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

// Superadmin console to exercise ming-msg-worker before reservations exist.
const CONSOLE_REF = "admin-console";

const internalSupportProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isInternalSupportEmail(ctx.session.user.email)) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

async function listConversations({ db, env }: { db: DrizzleDb; env: RuntimeEnv }) {
  const conversations = await listMessagingConversations({ db });
  const now = Date.now();

  return {
    configured: Boolean(env.MSG_WORKER),
    conversations: conversations.map((conversation) => ({
      ...conversation,
      replyOpen: conversation.lastInboundAt !== null && now - conversation.lastInboundAt < SESSION_WINDOW_MS,
    })),
  };
}

function requireWorker(env: RuntimeEnv) {
  if (!env.MSG_WORKER) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "MSG_WORKER no está configurado" });
  }
  return { worker: env.MSG_WORKER, productId: env.MSG_PRODUCT_ID };
}

const sendInputSchema = z.object({
  idempotencyKey: z.uuid(),
  templateId: z.enum(["hello_world", "reservation_attendance"]),
  to: z.string().regex(/^\+[1-9]\d{7,14}$/, "Usa formato internacional, p. ej. +34600000000"),
  data: z.record(z.string(), z.string()),
});

const replyInputSchema = z.object({
  conversationId: z.uuid(),
  text: z.string().trim().min(1).max(4096),
});

const eventsInputSchema = z.object({ conversationId: z.uuid() });

export const adminMessagingRouter = router({
  conversations: internalSupportProcedure.query(({ ctx }) => listConversations({ db: ctx.db, env: ctx.env })),
  events: internalSupportProcedure
    .input(eventsInputSchema)
    .query(({ ctx, input }) => listMessagingEvents({ db: ctx.db, conversationId: input.conversationId })),
  send: internalSupportProcedure.input(sendInputSchema).mutation(async ({ ctx, input }) => {
    const result = await sendTemplate({ ...requireWorker(ctx.env), ...input, ref: CONSOLE_REF });
    await insertMessagingEvent({
      db: ctx.db,
      event: { ...result, ref: CONSOLE_REF, direction: "out", type: "template", text: input.templateId },
    });
    return result;
  }),
  reply: internalSupportProcedure.input(replyInputSchema).mutation(async ({ ctx, input }) => {
    const result = await replyText({ ...requireWorker(ctx.env), ...input });
    await insertMessagingEvent({
      db: ctx.db,
      event: {
        ...result,
        conversationId: input.conversationId,
        ref: CONSOLE_REF,
        direction: "out",
        type: "text",
        text: input.text,
      },
    });
    return result;
  }),
});
