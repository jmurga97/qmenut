import { createDb } from "@qmenut/db/client";
import { acceptOverdueStampRequests, expireStaleRedemptions } from "@qmenut/db/repositories/loyalty-ledger.repository";
import {
  countUnhandledNotifications,
  deleteExpiredNotifications,
  deletePushDeviceById,
  getPushDelivery,
} from "@qmenut/db/repositories/notifications.repository";
import * as Sentry from "@sentry/cloudflare";

import { getNotificationEvent, getVapidKeys } from "./events";
import { REDEMPTION_TTL_MS } from "../../lib/loyalty/token";
import { sendWebPush } from "../../lib/web-push";

import type { PushMessage, RuntimeEnv } from "../../config/env/schema";
import type { VapidKeys } from "../../lib/web-push";
import type { DrizzleDb } from "@qmenut/db/client";

const DEFAULT_RETRY_SECONDS = 30;

async function deliverPush({
  db,
  vapid,
  message,
}: {
  db: DrizzleDb;
  vapid: VapidKeys | null;
  message: Message<PushMessage>;
}): Promise<void> {
  const delivery = await getPushDelivery({ db, ...message.body });
  const config = delivery ? getNotificationEvent(delivery.type) : undefined;

  if (!vapid || !delivery || !config?.pushText || delivery.expiresAt <= Date.now()) {
    message.ack();
    return;
  }

  const branchCount = config.push === "branchCount" && delivery.branchId !== null;
  const count = branchCount
    ? await countUnhandledNotifications({ db, type: delivery.type, branchId: delivery.branchId! })
    : 1;

  // A per-branch push still goes out while others wait, with the current count.
  if (branchCount ? count === 0 : delivery.handledAt !== null) {
    message.ack();
    return;
  }

  const text = config.pushText({ facts: delivery.facts, branchName: delivery.branchName ?? "", count })[
    delivery.device.language
  ];
  // Same tag and Topic per branch: the device and the push service replace the previous push.
  const tag = branchCount ? `${delivery.type}:${delivery.branchId}` : message.body.notificationId;
  const result = await sendWebPush({
    subscription: delivery.device,
    payload: JSON.stringify({ ...text, url: config.url, tag }),
    vapid,
    topic: branchCount ? tag : undefined,
  });

  if (result.status === 404 || result.status === 410) {
    await deletePushDeviceById({ db, id: delivery.device.id });
  } else if (result.status === 429 || result.status >= 500) {
    message.retry({ delaySeconds: result.retryAfterSeconds ?? DEFAULT_RETRY_SECONDS });
    return;
  } else if (result.status >= 400) {
    // A rejected VAPID key or payload fails the same way on every retry.
    Sentry.captureMessage(`Push rejected with ${result.status}`, { tags: { module: "notifications-push" } });
  }

  message.ack();
}

export async function consumePushMessages(batch: MessageBatch<PushMessage>, env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);
  const vapid = getVapidKeys(env);

  for (const message of batch.messages) {
    try {
      await deliverPush({ db, vapid, message });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: "notifications-push" } });
      message.retry({ delaySeconds: DEFAULT_RETRY_SECONDS });
    }
  }
}

/**
 * Minute cron: retention, expiring redemptions nobody opened so their notifications stop counting, and
 * accepting stamp requests nobody answered in 12 h (ADR 0007).
 */
export async function runNotificationMaintenance(env: RuntimeEnv): Promise<void> {
  const db = createDb(env.DB);

  try {
    await deleteExpiredNotifications({ db });
    await expireStaleRedemptions({ db, olderThanMs: REDEMPTION_TTL_MS });
    await acceptOverdueStampRequests({ db });
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "notifications-maintenance" } });
  }
}
