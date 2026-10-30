import { formatMinute } from "@qmenut/db/domain/local-time";
import { listReservationMessages } from "@qmenut/db/repositories/reservations.repository";
import * as Sentry from "@sentry/cloudflare";

import { emitNotification, resolveNotifications } from "../notifications/emit-notification";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { ReservationMessage, ReservationRow } from "@qmenut/db/repositories/reservations.repository";

const SEND_PATH = "https://email-worker.internal/send?productId=qmenut";
const FROM_PROFILE = "qmenut-default";
const REQUEST_TIMEOUT_MS = 15_000;
/** Owners read the admin in Spanish unless they switch it; their emails follow. */
const OWNER_LOCALE = "es";

type ReservationTemplate =
  | "reservation-received"
  | "reservation-new-request"
  | "reservation-accepted"
  | "reservation-declined"
  | "reservation-cancelled";

export type ReservationEvent =
  | { kind: "requested" }
  | { kind: "accepted"; handledBy: string | null; automatic: boolean }
  | { kind: "declined"; handledBy: string }
  | { kind: "cancelled"; by: "guest" | "staff"; handledBy: string | null; wasAccepted: boolean }
  | { kind: "unconfirmed" };

interface MessagesContext {
  db: DrizzleDb;
  env: RuntimeEnv;
}

interface EmailInput {
  env: RuntimeEnv;
  template: ReservationTemplate;
  to: string;
  data: Record<string, string | number | null>;
}

/** Never throws: the reservation already changed, and a lost email must not report it as failed. */
async function sendEmail({ env, template, to, data }: EmailInput): Promise<void> {
  try {
    const response = await env.EMAIL_WORKER.fetch(SEND_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template,
        fromProfile: FROM_PROFILE,
        to,
        data,
        metadata: { requestId: crypto.randomUUID(), source: "reservations" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    await response.arrayBuffer();

    if (!response.ok) {
      Sentry.captureMessage(`Email worker rejected ${template} with ${response.status}`, {
        tags: { module: "reservation-messages" },
      });
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "reservation-messages", template } });
  }
}

function emailData(message: ReservationMessage) {
  return {
    restaurantName: message.restaurantName,
    branchName: message.branchName,
    date: message.slotDate,
    time: formatMinute(message.slotMinute),
    partySize: message.partySize,
    guestName: message.guestName,
  };
}

interface EmailTarget {
  env: RuntimeEnv;
  message: ReservationMessage;
  template: ReservationTemplate;
}

function emailGuest({ env, message, template }: EmailTarget) {
  if (!message.guestEmail) return Promise.resolve();

  const data = {
    ...emailData(message),
    locale: message.guestLanguage,
    audience: "guest",
    branchPhone: message.branchPhone,
  };
  return sendEmail({ env, template, to: message.guestEmail, data });
}

function emailOwners({ env, message, template }: EmailTarget) {
  const data = {
    ...emailData(message),
    locale: OWNER_LOCALE,
    audience: "owner",
    guestPhone: message.guestPhone,
    panelUrl: `${env.ADMIN_APP_URL}/reservations?date=${message.slotDate}`,
  };

  return Promise.all(message.ownerEmails.map((to) => sendEmail({ env, template, to, data })));
}

function emit({
  db,
  env,
  message,
  type,
}: MessagesContext & {
  message: ReservationMessage;
  type: `reservation.${"requested" | "cancelled" | "unconfirmed"}`;
}) {
  return emitNotification({
    db,
    env,
    event: {
      type,
      restaurantId: message.restaurantId,
      branchId: message.branchId,
      subjectId: message.id,
      facts: { slotDate: message.slotDate, slotMinute: message.slotMinute, partySize: message.partySize },
    },
  });
}

async function announce({
  db,
  env,
  message,
  event,
}: MessagesContext & { message: ReservationMessage; event: ReservationEvent }) {
  switch (event.kind) {
    case "requested":
      await Promise.all([
        emailGuest({ env, message, template: "reservation-received" }),
        emailOwners({ env, message, template: "reservation-new-request" }),
        emit({ db, env, message, type: "reservation.requested" }),
      ]);
      return;
    case "accepted":
      await emailGuest({ env, message, template: "reservation-accepted" });
      return;
    case "declined":
      await emailGuest({ env, message, template: "reservation-declined" });
      return;
    case "cancelled":
      await Promise.all([
        emailGuest({ env, message, template: "reservation-cancelled" }),
        event.wasAccepted ? emailOwners({ env, message, template: "reservation-cancelled" }) : null,
        // Staff who cancel know already; a guest's cancellation of a held table is news.
        event.wasAccepted && event.by === "guest" ? emit({ db, env, message, type: "reservation.cancelled" }) : null,
      ]);
      return;
    case "unconfirmed":
      await emit({ db, env, message, type: "reservation.unconfirmed" });
      return;
  }
}

/** The open notifications each event settles, as markNotificationsHandled input. */
function resolutions(event: ReservationEvent): { type: string; handledBy: string | null; outcome: string }[] {
  switch (event.kind) {
    case "accepted":
      return [
        {
          type: "reservation.requested",
          handledBy: event.handledBy,
          outcome: event.automatic ? "autoAccepted" : "accepted",
        },
      ];
    case "declined":
      return [{ type: "reservation.requested", handledBy: event.handledBy, outcome: "declined" }];
    case "cancelled": {
      const outcome = event.by === "guest" ? "cancelled" : "cancelledByStaff";
      return ["reservation.requested", "reservation.unconfirmed"].map((type) => ({
        type,
        handledBy: event.handledBy,
        outcome,
      }));
    }
    case "requested":
    case "unconfirmed":
      return [];
  }
}

/**
 * For a row a guest just cancelled: guests never set handled_at, and a declined request holds no table, so a
 * handled one had been accepted (by staff or automatically).
 */
export function wasAccepted(row: Pick<ReservationRow, "handledAt">): boolean {
  return row.handledAt !== null;
}

/**
 * Emails and staff notifications for reservations that just changed. Never throws: callers run it after the
 * change committed.
 */
export async function announceReservations({
  db,
  env,
  reservationIds,
  event,
}: MessagesContext & { reservationIds: string[]; event: ReservationEvent }): Promise<void> {
  if (reservationIds.length === 0) return;

  for (const resolution of resolutions(event)) {
    await resolveNotifications({ db, ...resolution, subjectIds: reservationIds });
  }

  try {
    for (let index = 0; index < reservationIds.length; index += 50) {
      const messages = await listReservationMessages({ db, reservationIds: reservationIds.slice(index, index + 50) });
      await Promise.all(messages.map((message) => announce({ db, env, message, event })));
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "reservation-messages", kind: event.kind } });
  }
}
