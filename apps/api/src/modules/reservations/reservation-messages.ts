import { formatMinute } from "@qmenut/db/domain/local-time";
import { listReservationMessages } from "@qmenut/db/repositories/reservations.repository";
import * as Sentry from "@sentry/cloudflare";

import { emitNotification } from "../notifications/emit-notification";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { ReservationMessage } from "@qmenut/db/repositories/reservations.repository";

const SEND_PATH = "https://email-worker.internal/send?productId=qmenut";
const FROM_PROFILE = "qmenut-default";
const REQUEST_TIMEOUT_MS = 15_000;

type ReservationTemplate = "reservation-booked" | "reservation-reminder" | "reservation-cancelled";

export type ReservationEvent = { kind: "booked" } | { kind: "reminder" } | { kind: "cancelled"; by: "guest" | "staff" };
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

/** ADR 0008: the reservation id is the link's secret; the page trades it for the guest's email. */
function manageUrl(message: ReservationMessage): string | null {
  if (!message.branchHost) return null;

  return `https://${message.branchHost}/${message.guestLanguage}/reservar?reserva=${message.id}`;
}

function emailGuest({
  env,
  message,
  template,
}: {
  env: RuntimeEnv;
  message: ReservationMessage;
  template: ReservationTemplate;
}) {
  if (!message.guestEmail) return Promise.resolve();

  const data = {
    restaurantName: message.restaurantName,
    branchName: message.branchName,
    branchPhone: message.branchPhone,
    date: message.slotDate,
    time: formatMinute(message.slotMinute),
    partySize: message.partySize,
    guestName: message.guestName,
    locale: message.guestLanguage,
    manageUrl: manageUrl(message),
  };
  return sendEmail({ env, template, to: message.guestEmail, data });
}

function emit({
  db,
  env,
  message,
  type,
}: MessagesContext & { message: ReservationMessage; type: "reservation.booked" | "reservation.cancelled" }) {
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
    case "booked":
      await Promise.all([
        emailGuest({ env, message, template: "reservation-booked" }),
        emit({ db, env, message, type: "reservation.booked" }),
      ]);
      return;
    case "reminder":
      await emailGuest({ env, message, template: "reservation-reminder" });
      return;
    case "cancelled":
      // Every cancellation reaches the guest's inbox (ADR 0004); staff who cancel know already.
      await Promise.all([
        emailGuest({ env, message, template: "reservation-cancelled" }),
        event.by === "guest" ? emit({ db, env, message, type: "reservation.cancelled" }) : null,
      ]);
      return;
  }
}

/** Guest emails and staff notifications for reservations that just changed. Never throws: callers run it after the change committed. */
export async function announceReservations({
  db,
  env,
  reservationIds,
  event,
}: MessagesContext & { reservationIds: string[]; event: ReservationEvent }): Promise<void> {
  if (reservationIds.length === 0) return;

  try {
    for (let index = 0; index < reservationIds.length; index += 50) {
      const messages = await listReservationMessages({ db, reservationIds: reservationIds.slice(index, index + 50) });
      await Promise.all(messages.map((message) => announce({ db, env, message, event })));
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "reservation-messages", kind: event.kind } });
  }
}
