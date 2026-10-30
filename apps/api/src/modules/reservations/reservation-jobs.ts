import { createDb } from "@qmenut/db/client";
import { formatMinute } from "@qmenut/db/domain/local-time";
import { insertMessagingEvent } from "@qmenut/db/repositories/messaging-events.repository";
import {
  anonymizeOldReservations,
  claimAttendanceCheck,
  handleStartedUnconfirmedNotifications,
  listAttendanceChecksDue,
  markUnconfirmedReservations,
  releaseAttendanceCheck,
} from "@qmenut/db/repositories/reservations.repository";
import * as Sentry from "@sentry/cloudflare";
import { TRPCError } from "@trpc/server";

import { acceptOverdueReservations } from "./accept-overdue-reservations";
import { announceReservations } from "./reservation-messages";
import { sendTemplate } from "../messaging/msg-worker.client";

import type { MsgProductId, MsgWorkerBinding, RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { AttendanceCheck } from "@qmenut/db/repositories/reservations.repository";

const ATTENDANCE_TEMPLATE = "reservation_attendance";

function templateName(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim().slice(0, 60);
}

function formatTemplateData(check: AttendanceCheck): Record<string, string> {
  const [, month, day] = check.slotDate.split("-");

  return {
    customerName: templateName(check.guestName ?? "") || "Cliente",
    restaurantName: templateName(check.branchName) || "Restaurante",
    date: `${day}/${month}`,
    time: formatMinute(check.slotMinute),
    partySize: String(check.partySize),
  };
}

/** A gateway or network failure may pass on the next minute; anything else (opted out, bad number) won't. */
function isRetryable(error: unknown): boolean {
  return !(error instanceof TRPCError) || error.code === "BAD_GATEWAY";
}

interface SendCheckInput {
  db: DrizzleDb;
  worker: MsgWorkerBinding;
  productId: MsgProductId;
  check: AttendanceCheck;
}

async function sendAttendanceCheck({ db, worker, productId, check }: SendCheckInput): Promise<void> {
  if (!(await claimAttendanceCheck({ db, reservationId: check.id }))) return;

  try {
    // ponytail: ming-msg-worker registers this template in Spanish only, so every guest gets it in Spanish;
    // add an English template there and pick it from guest_language when it exists.
    const result = await sendTemplate({
      worker,
      productId,
      idempotencyKey: `reservation-${check.id}:attendance`,
      templateId: ATTENDANCE_TEMPLATE,
      to: check.guestPhone,
      ref: check.id,
      data: formatTemplateData(check),
    });
    await insertMessagingEvent({
      db,
      event: { ...result, ref: check.id, direction: "out", type: "template", text: ATTENDANCE_TEMPLATE },
    });
  } catch (error) {
    if (isRetryable(error)) await releaseAttendanceCheck({ db, reservationId: check.id });
    Sentry.captureException(error, { tags: { module: "reservation-jobs" }, extra: { reservationId: check.id } });
  }
}

async function sendAttendanceChecks({ db, env }: { db: DrizzleDb; env: RuntimeEnv }): Promise<void> {
  const due = await listAttendanceChecksDue({ db });
  if (due.length === 0) return;

  // Local wrangler dev has no MSG_WORKER on purpose: leave the checks unclaimed instead of failing the cron.
  if (!env.MSG_WORKER) {
    console.log(`MSG_WORKER no está configurado: ${due.length} confirmaciones de asistencia sin enviar`);
    return;
  }

  for (const check of due) {
    await sendAttendanceCheck({ db, worker: env.MSG_WORKER, productId: env.MSG_PRODUCT_ID, check });
  }
}

async function runStep(step: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "reservation-jobs", step } });
  }
}

/** Minute cron, in lifecycle order; each step runs on its own so one failing never blocks the others. */
export async function runReservationJobs(env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);

  await runStep("accept", () => acceptOverdueReservations({ db, env }));
  await runStep("attendance", () => sendAttendanceChecks({ db, env }));
  await runStep("unconfirmed", async () => {
    const rows = await markUnconfirmedReservations({ db });
    await announceReservations({ db, env, reservationIds: rows.map((row) => row.id), event: { kind: "unconfirmed" } });
  });
  await runStep("slotStarted", () => handleStartedUnconfirmedNotifications({ db }));
  await runStep("anonymize", () => anonymizeOldReservations({ db }));
}
