import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ExchangeRateWorkerBinding } from "../../config/env/schema";

const rateSourceSchema = z.enum(["bcv", "bcv-dolarapi"]);

const rateReferenceSchema = z.object({
  currency: z.enum(["USD", "EUR"]),
  rate: z.string().regex(/^\d{1,7}(\.\d{1,8})?$/),
  source: rateSourceSchema,
  capturedAt: z.iso.datetime(),
  fetchedAt: z.iso.datetime(),
});

const workerErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
});

const latestRatesSchema = z.object({
  success: z.literal(true),
  data: z.object({
    base: z.literal("VES"),
    rates: z.array(rateReferenceSchema),
  }),
});

const captureStatusSchema = z.object({
  success: z.literal(true),
  data: z.object({
    lastRunAt: z.iso.datetime().nullable(),
    lastSuccessAt: z.iso.datetime().nullable(),
    lastRunStatus: z.enum(["succeeded", "partial", "failed"]).nullable(),
    lastErrorCode: z.string().nullable(),
    rates: z.array(rateReferenceSchema),
  }),
});

export type ExchangeRateReference = z.infer<typeof rateReferenceSchema>;
export type LatestExchangeRates = z.infer<typeof latestRatesSchema>["data"];
export type ExchangeRateCaptureStatus = z.infer<typeof captureStatusSchema>["data"];

interface WorkerInput {
  worker: ExchangeRateWorkerBinding;
}

interface LatestRatesInput extends WorkerInput {
  currencies?: Array<"USD" | "EUR">;
}

function mapWorkerError(error: z.infer<typeof workerErrorSchema>["error"]): TRPCError {
  if (error.code === "INVALID_BODY") {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }

  const code = error.retryable ? ("BAD_GATEWAY" as const) : ("INTERNAL_SERVER_ERROR" as const);

  return new TRPCError({ code, message: error.message });
}

function invalidWorkerResponse(): TRPCError {
  return new TRPCError({
    code: "BAD_GATEWAY",
    message: "El servicio de referencia cambiaria devolvió una respuesta no válida",
  });
}

/**
 * Lee la referencia oficial BCV (VES por 1 USD/EUR) del worker privado mediante RPC.
 * La lista puede venir vacía antes de la primera captura del cron.
 */
export async function getLatestExchangeRates(input: LatestRatesInput): Promise<LatestExchangeRates> {
  const body = await input.worker.getLatestRates(input.currencies ? { currencies: input.currencies } : {});
  const error = workerErrorSchema.safeParse(body);
  if (error.success) throw mapWorkerError(error.data.error);

  const parsed = latestRatesSchema.safeParse(body);
  if (!parsed.success) throw invalidWorkerResponse();

  return parsed.data.data;
}

/**
 * Respuesta administrativa del worker: estado de la última captura y fecha del
 * último snapshot por moneda, para mostrar la referencia externa en el panel.
 */
export async function getExchangeRateCaptureStatus(input: WorkerInput): Promise<ExchangeRateCaptureStatus> {
  const body = await input.worker.getCaptureStatus();
  const error = workerErrorSchema.safeParse(body);
  if (error.success) throw mapWorkerError(error.data.error);

  const parsed = captureStatusSchema.safeParse(body);
  if (!parsed.success) throw invalidWorkerResponse();

  return parsed.data.data;
}
