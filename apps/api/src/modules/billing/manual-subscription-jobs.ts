import { createDb } from "@qmenut/db/client";
import {
  listManualSubscriptionsEnding,
  upsertManualSubscriptionStatement,
} from "@qmenut/db/repositories/trials.repository";
import * as Sentry from "@sentry/cloudflare";

import { writeBranchPlan } from "./sync-subscription-state";

import type { RuntimeEnv } from "../../config/env/schema";
import type { SubscriptionListRow } from "@qmenut/db/repositories/trials.repository";

const DAY_MS = 86_400_000;
export const REMINDER_DAYS = 5;
const SEND_PATH = "https://email-worker.internal/send?productId=qmenut";

type NoticeKind = "trial-ending" | "trial-ended" | "plan-ending" | "plan-ended";

async function sendNotice({
  env,
  row,
  kind,
}: {
  env: RuntimeEnv;
  row: SubscriptionListRow;
  kind: NoticeKind;
}): Promise<void> {
  if (!row.ownerEmail) return;
  const response = await env.EMAIL_WORKER.fetch(SEND_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      template: "trial-notice",
      fromProfile: "qmenut-default",
      to: row.ownerEmail,
      data: {
        kind,
        restaurantName: row.restaurantName,
        ownerName: row.ownerName ?? "",
        daysLeft: REMINDER_DAYS,
        panelUrl: `${env.ADMIN_APP_URL}/billing`,
      },
      metadata: { requestId: crypto.randomUUID(), source: "trial-notice" },
    }),
  });
  if (!response.ok) throw new Error(`El worker de correo rechazó ${kind} (${response.status})`);
}

/**
 * Daily: plans billed outside Stripe (self-serve demos, staff-activated Venezuelan plans) get a reminder
 * five days before they end, and are switched off once they end. Rows and menu stay; paying turns it back on.
 */
export async function runManualSubscriptionJobs(env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);
  const now = Date.now();

  // ponytail: window-based, so one daily run sends one reminder; add a reminder_sent_at if the cron ever runs more often.
  const ending = await listManualSubscriptionsEnding({
    db,
    after: now + (REMINDER_DAYS - 1) * DAY_MS,
    until: now + REMINDER_DAYS * DAY_MS,
  });
  const expired = await listManualSubscriptionsEnding({ db, after: 0, until: now });

  const jobs = [
    ...ending.map(
      (row) => () => sendNotice({ env, row, kind: row.status === "trialing" ? "trial-ending" : "plan-ending" }),
    ),
    ...expired.map((row) => async () => {
      await writeBranchPlan({
        db,
        env,
        restaurantId: row.restaurantId,
        branchId: row.branchId,
        planCode: "basic",
        isActive: false,
        subscription: upsertManualSubscriptionStatement({
          db,
          data: { ...row, status: "canceled", endsAt: row.endsAt },
        }),
      });
      await sendNotice({ env, row, kind: row.status === "trialing" ? "trial-ended" : "plan-ended" });
    }),
  ];

  for (const job of jobs) {
    try {
      await job();
    } catch (error) {
      Sentry.captureException(error, { tags: { module: "manual-subscriptions" } });
    }
  }
}
