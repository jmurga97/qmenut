import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { MsgProductId, MsgWorkerBinding } from "../../config/env/schema";

const workerErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }),
});

const sendResultSchema = z.object({
  success: z.literal(true),
  data: z.object({ conversationId: z.string(), messageId: z.string() }),
});

const replyResultSchema = z.object({
  success: z.literal(true),
  data: z.object({ messageId: z.string() }),
});

const CLIENT_ERROR_CODES = new Set([
  "INVALID_BODY",
  "RECIPIENT_OPTED_OUT",
  "CONVERSATION_NOT_FOUND",
  "OUTSIDE_SESSION_WINDOW",
]);

function unwrap<Data>(body: unknown, schema: z.ZodType<{ success: true; data: Data }>): Data {
  const error = workerErrorSchema.safeParse(body);

  if (error.success) {
    const { code, message, retryable } = error.data.error;
    if (CLIENT_ERROR_CODES.has(code)) throw new TRPCError({ code: "BAD_REQUEST", message: `${code}: ${message}` });
    throw new TRPCError({ code: retryable ? "BAD_GATEWAY" : "INTERNAL_SERVER_ERROR", message: `${code}: ${message}` });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "El servicio de mensajería devolvió una respuesta no válida" });
  }

  return parsed.data.data;
}

interface WorkerInput {
  worker: MsgWorkerBinding;
  productId: MsgProductId;
}

interface SendTemplateInput extends WorkerInput {
  idempotencyKey: string;
  templateId: string;
  to: string;
  ref: string;
  data: Record<string, string>;
}

export async function sendTemplate({ worker, ...input }: SendTemplateInput) {
  return unwrap(await worker.send(input), sendResultSchema);
}

interface ReplyTextInput extends WorkerInput {
  conversationId: string;
  text: string;
}

export async function replyText({ worker, ...input }: ReplyTextInput) {
  return unwrap(await worker.reply(input), replyResultSchema);
}
