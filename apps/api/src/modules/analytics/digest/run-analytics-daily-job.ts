import { createDb } from "@qmenut/db/client";
import * as Sentry from "@sentry/cloudflare";

import { parseEnv } from "@/config/env";

import { getRestaurantAnalyticsSnapshot } from "../get-restaurant-analytics-snapshot";
import { syncAnalyticsFromPostHog } from "../sync-analytics";
import { buildDigestEmailData } from "./build-digest-email-data";
import {
  advanceDigestAnchor,
  claimDelivery,
  createDeliveriesForOwners,
  listDeliveryCandidates,
  markDeliveryResult,
  readDigestAnchor,
} from "./digest-deliveries";
import { lastCompleteDay, nextPendingPeriod } from "./digest-periods";
import { sendAnalyticsDigestEmail } from "./send-analytics-digest-email";

import type { DigestRecipient } from "./digest-deliveries";
import type { RestaurantAnalyticsSnapshot } from "../restaurant-analytics.types";
import type { EnvBindings, RuntimeEnv } from "@/config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

/** Dos envíos en paralelo dejan margen para las lecturas D1 emparejadas de cada snapshot. */
const SEND_CONCURRENCY = 2;

interface DispatchContext {
  db: DrizzleDb;
  emailWorker: RuntimeEnv["EMAIL_WORKER"];
  failed: number;
  snapshots: Map<string, Promise<RestaurantAnalyticsSnapshot | null>>;
  sent: number;
}

function snapshotKey(recipient: DigestRecipient): string {
  return `${recipient.restaurantId}:${recipient.periodStartDay}:${recipient.periodEndDay}`;
}

async function loadSnapshot(
  context: DispatchContext,
  recipient: DigestRecipient,
): Promise<RestaurantAnalyticsSnapshot | null> {
  const key = snapshotKey(recipient);
  const cached = context.snapshots.get(key);

  if (cached) {
    return cached;
  }

  const promise = (async () => {
    try {
      return await getRestaurantAnalyticsSnapshot({
        db: context.db,
        from: recipient.periodStartDay,
        restaurantId: recipient.restaurantId,
        to: recipient.periodEndDay,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: "analytics-digest" } });
      return null;
    }
  })();

  context.snapshots.set(key, promise);
  return promise;
}

async function failDelivery({
  context,
  recipient,
  errorCode,
}: {
  context: DispatchContext;
  recipient: DigestRecipient;
  errorCode: string;
}): Promise<void> {
  context.failed += 1;
  await markDeliveryResult({ db: context.db, deliveryId: recipient.deliveryId, errorCode, sentAtMs: null });
}

async function deliverToRecipient(context: DispatchContext, recipient: DigestRecipient): Promise<void> {
  const claimed = await claimDelivery({ db: context.db, deliveryId: recipient.deliveryId, nowMs: Date.now() });

  if (!claimed) {
    return;
  }

  try {
    const snapshot = await loadSnapshot(context, recipient);

    if (!snapshot) {
      await failDelivery({ context, recipient, errorCode: "SNAPSHOT_UNAVAILABLE" });
      return;
    }

    const result = await sendAnalyticsDigestEmail({
      data: buildDigestEmailData(snapshot, recipient.restaurantName),
      emailWorker: context.emailWorker,
      recipientEmail: recipient.email,
      requestId: recipient.deliveryId,
    });

    if (result.errorCode !== null) {
      await failDelivery({ context, recipient, errorCode: result.errorCode });
      return;
    }

    context.sent += 1;
    await markDeliveryResult({
      db: context.db,
      deliveryId: recipient.deliveryId,
      errorCode: null,
      sentAtMs: Date.now(),
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "analytics-digest" } });
    await failDelivery({ context, recipient, errorCode: "UNEXPECTED_ERROR" });
  }
}

async function dispatchRecipients({
  db,
  env,
  recipients,
}: {
  db: DrizzleDb;
  env: RuntimeEnv;
  recipients: DigestRecipient[];
}): Promise<{ failed: number; sent: number }> {
  const context: DispatchContext = {
    db,
    emailWorker: env.EMAIL_WORKER,
    failed: 0,
    sent: 0,
    snapshots: new Map(),
  };
  const queue = [...recipients];
  const runners = Array.from({ length: Math.min(SEND_CONCURRENCY, queue.length) }, async () => {
    for (let recipient = queue.shift(); recipient; recipient = queue.shift()) {
      await deliverToRecipient(context, recipient);
    }
  });

  await Promise.all(runners);
  return { failed: context.failed, sent: context.sent };
}

export async function dispatchDueDigest({
  env,
  nowMs,
  scheduleNewPeriod = true,
}: {
  env: RuntimeEnv;
  nowMs: number;
  scheduleNewPeriod?: boolean;
}): Promise<{ periodEndDay: string | null; sent: number; failed: number }> {
  const db = createDb(env.DB);
  let periodEndDay: string | null = null;

  if (scheduleNewPeriod) {
    const anchor = await readDigestAnchor(db);
    const period = nextPendingPeriod(anchor, lastCompleteDay(nowMs));

    if (period) {
      // La creación es idempotente; solo después se avanza el ancla del calendario.
      await createDeliveriesForOwners({ db, period });
      await advanceDigestAnchor({ db, endDay: period.endDay, updatedAt: nowMs });
      periodEndDay = period.endDay;
    }
  }

  const recipients = await listDeliveryCandidates(db, nowMs);
  const result = await dispatchRecipients({ db, env, recipients });

  return { ...result, periodEndDay };
}

/** Sincroniza agregados y procesa todos los reintentos elegibles en cada Cron Trigger diario. */
export async function runAnalyticsDailyJob(rawEnv: EnvBindings): Promise<void> {
  const sync = await syncAnalyticsFromPostHog(rawEnv);
  const env = parseEnv(rawEnv);

  if (sync.status === "failed") {
    console.error(`[analytics] sincronización fallida (${sync.errorCode}); se reintentan entregas existentes`);
  }

  await dispatchDueDigest({ env, nowMs: Date.now(), scheduleNewPeriod: sync.status === "success" });
}
