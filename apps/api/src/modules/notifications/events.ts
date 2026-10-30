import { formatMinute } from "@qmenut/db/domain/local-time";

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
  url: string | ((facts: NotificationFacts) => string);
  pushText?: (input: { facts: NotificationFacts; branchName: string; count: number }) => Record<PushLanguage, PushText>;
}

const PARTY_WORDS: Record<PushLanguage, [one: string, many: string]> = {
  es: ["persona", "personas"],
  en: ["guest", "guests"],
};

/** "vie 21:00 · 4 personas" from a reservation's facts, in the device's language. */
function describeReservation(facts: NotificationFacts, language: PushLanguage): string {
  const weekday = new Intl.DateTimeFormat(language, { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${facts.slotDate}T00:00:00Z`),
  );
  const guests = Number(facts.partySize);
  const [one, many] = PARTY_WORDS[language];

  return `${weekday} ${formatMinute(Number(facts.slotMinute))} · ${guests} ${guests === 1 ? one : many}`;
}

function reservationPush(titles: Record<PushLanguage, string>): NotificationEventConfig {
  return {
    actionable: true,
    push: "each",
    url: (facts) => `/reservations?date=${facts.slotDate}`,
    pushText: ({ facts, branchName }) => ({
      es: { title: titles.es, body: `${branchName} · ${describeReservation(facts, "es")}` },
      en: { title: titles.en, body: `${branchName} · ${describeReservation(facts, "en")}` },
    }),
  };
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
  "reservation.requested": reservationPush({ es: "Nueva solicitud de reserva", en: "New reservation request" }),
  "reservation.cancelled": {
    ...reservationPush({ es: "Reserva cancelada", en: "Reservation cancelled" }),
    actionable: false,
  },
  "reservation.unconfirmed": reservationPush({ es: "Reserva sin confirmar", en: "Unconfirmed reservation" }),
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
