import { createDb } from "@qmenut/db/client";
import { anonymizeOldReservations, claimDueReminders } from "@qmenut/db/repositories/reservations.repository";
import * as Sentry from "@sentry/cloudflare";

import { announceReservations } from "./reservation-messages";

import type { RuntimeEnv } from "../../config/env/schema";

async function runStep(step: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "reservation-jobs", step } });
  }
}

/** Minute cron; each step runs on its own so one failing never blocks the other. */
export async function runReservationJobs(env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);

  await runStep("reminders", async () => {
    // ponytail: claimed before sending, so a reminder the email worker drops is not retried; add a retry if it matters.
    const reservationIds = await claimDueReminders({ db });
    await announceReservations({ db, env, reservationIds, event: { kind: "reminder" } });
  });
  await runStep("anonymize", () => anonymizeOldReservations({ db }));
}
