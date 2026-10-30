import {
  createNotification,
  listPushTargetIds,
  markNotificationsHandled,
} from "@qmenut/db/repositories/notifications.repository";
import * as Sentry from "@sentry/cloudflare";

import { getVapidKeys, NOTIFICATION_EVENTS } from "./events";

import type { NotificationType } from "./events";
import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { NotificationFacts } from "@qmenut/db/repositories/notifications.repository";

const QUEUE_BATCH_LIMIT = 100;

interface EmitNotificationInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  event: {
    type: Exclude<NotificationType, "announcement">;
    restaurantId: string;
    branchId: string | null;
    subjectId: string;
    facts: NotificationFacts;
  };
}

/** Writes the inbox rows and queues the pushes. Never throws: the action that caused the event must not fail. */
export async function emitNotification({ db, env, event }: EmitNotificationInput): Promise<void> {
  try {
    const config = NOTIFICATION_EVENTS[event.type];
    const notificationId = await createNotification({ db, notification: { ...event, actionable: config.actionable } });

    if (!notificationId || !getVapidKeys(env)) return;

    const deviceIds = await listPushTargetIds({ db, notificationId });

    for (let index = 0; index < deviceIds.length; index += QUEUE_BATCH_LIMIT) {
      await env.NOTIFICATIONS_QUEUE.sendBatch(
        deviceIds.slice(index, index + QUEUE_BATCH_LIMIT).map((deviceId) => ({ body: { notificationId, deviceId } })),
      );
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "notifications", type: event.type } });
  }
}

/** Never throws: the action already committed, so a stale notification beats reporting it as failed. */
export async function resolveNotifications(input: Parameters<typeof markNotificationsHandled>[0]): Promise<void> {
  try {
    await markNotificationsHandled(input);
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "notifications", type: input.type } });
  }
}
