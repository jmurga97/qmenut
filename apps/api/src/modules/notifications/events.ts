import type { RuntimeEnv } from "../../config/env/schema";
import type { VapidKeys } from "../../lib/web-push";
import type { NotificationFacts, PushLanguage } from "@qmenut/db/repositories/notifications.repository";

interface PushText {
  title: string;
  body: string;
}

interface NotificationEventConfig {
  actionable: boolean;
  /**
   * each: one push per event, dropped once handled. never: inbox only. branchCount: one replaceable push per
   * branch carrying how many of this type are waiting there, skipped at 0.
   */
  push: "each" | "never" | "branchCount";
  /** Admin path the push opens. */
  url: string;
  pushText?: (input: { facts: NotificationFacts; branchName: string; count: number }) => Record<PushLanguage, PushText>;
}

/** Every notification type. Text in pushes carries no guest personal data. */
export const NOTIFICATION_EVENTS = {
  "loyalty.redemption": {
    actionable: true,
    push: "each",
    url: "/loyalty",
    pushText: ({ facts, branchName }) => ({
      es: { title: "Canje pendiente", body: `${branchName} · ${facts.rewardName}` },
      en: { title: "Redemption waiting", body: `${branchName} · ${facts.rewardName}` },
    }),
  },
  "loyalty.stampRequest": {
    actionable: true,
    push: "branchCount",
    url: "/loyalty",
    pushText: ({ branchName, count }) => ({
      es: {
        title: "Solicitudes de sellos",
        body: `${count} ${count === 1 ? "solicitud" : "solicitudes"} de sellos · ${branchName}`,
      },
      en: { title: "Stamp requests", body: `${count} stamp ${count === 1 ? "request" : "requests"} · ${branchName}` },
    }),
  },
  announcement: { actionable: false, push: "never", url: "/notifications" },
} as const satisfies Record<string, NotificationEventConfig>;

export type NotificationType = keyof typeof NOTIFICATION_EVENTS;

export function getNotificationEvent(type: string): NotificationEventConfig | undefined {
  return (NOTIFICATION_EVENTS as Record<string, NotificationEventConfig>)[type];
}

export function getVapidKeys(env: RuntimeEnv): VapidKeys | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return null;

  return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT };
}
