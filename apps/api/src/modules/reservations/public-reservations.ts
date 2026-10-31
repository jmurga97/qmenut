import { addDays, getLocalDayAndMinute } from "@qmenut/db/domain/local-time";
import {
  answerGuestReservation,
  createReservation,
  findGuestEmail,
  getAvailability,
  getBookingInfo,
  isReservationsOpen,
  listGuestReservations,
} from "@qmenut/db/repositories/reservations.repository";
import { hasFeature } from "@qmenut/permissions";
import { TRPCError } from "@trpc/server";

import { announceReservations } from "./reservation-messages";
import { resolveTenantFromRequest } from "../tenant/resolve-tenant";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { PublicTenant } from "@qmenut/db/domain/tenant";
import type { AvailabilityDay, BookingInfo, GuestReservation } from "@qmenut/db/repositories/reservations.repository";

interface PublicInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
}

async function resolveReservationTenant({ db, request, host }: PublicInput): Promise<PublicTenant> {
  const tenant = await resolveTenantFromRequest({ db, request, host });
  if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
  return tenant;
}

/** Only new bookings need the plan, the branch's switch and at least one weekly slot. */
async function resolveBookingTenant(input: PublicInput): Promise<PublicTenant> {
  const tenant = await resolveReservationTenant(input);

  if (
    !hasFeature([tenant.planCode], "reservations") ||
    !(await isReservationsOpen({ db: input.db, branchId: tenant.branchId }))
  ) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Esta sucursal no acepta reservas" });
  }

  return tenant;
}

/** Keyed by IP: these endpoints send emails to, or reveal reservations for, any address typed in. */
async function throttle({ env, request, tenant }: Pick<PublicInput, "env" | "request"> & { tenant: PublicTenant }) {
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const visitorIp = request.headers.get("cf-connecting-ip") ?? forwardedIp ?? "unknown";
  const result = await env.RESERVATION_LIMITER.limit({ key: `${tenant.branchId}:${visitorIp}` });

  if (!result.success) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiados intentos, espera un momento" });
  }
}

export interface PublicAvailability extends Omit<BookingInfo, "windowDays"> {
  /** First and last bookable local dates, for the calendar's month navigation. */
  today: string;
  lastDate: string;
  days: AvailabilityDay[];
}

export async function getPublicAvailability({
  from,
  to,
  ...input
}: PublicInput & { from: string; to: string }): Promise<PublicAvailability> {
  const tenant = await resolveBookingTenant(input);
  const [info, days] = await Promise.all([
    getBookingInfo({ db: input.db, branchId: tenant.branchId }),
    getAvailability({ db: input.db, branchId: tenant.branchId, from, to }),
  ]);

  if (!info) throw new TRPCError({ code: "NOT_FOUND", message: "Esta sucursal no acepta reservas" });

  const { windowDays, ...rest } = info;
  const today = getLocalDayAndMinute({ nowMs: Date.now(), timeZone: info.timeZone }).date;

  return { ...rest, today, lastDate: addDays(today, windowDays), days };
}

export interface CreatePublicReservationInput extends PublicInput {
  date: string;
  minute: number;
  partySize: number;
  name: string;
  phone: string;
  email: string;
  language: string;
}

export async function createPublicReservation({
  date,
  minute,
  partySize,
  name,
  phone,
  email,
  language,
  ...input
}: CreatePublicReservationInput): Promise<{ id: string; startsAt: number }> {
  const tenant = await resolveBookingTenant(input);
  await throttle({ ...input, tenant });

  const result = await createReservation({
    db: input.db,
    branchId: tenant.branchId,
    date,
    minute,
    partySize,
    guestName: name,
    guestPhone: phone,
    guestEmail: email,
    guestLanguage: language,
  });

  if (result === "full") throw new TRPCError({ code: "CONFLICT", message: "Esa hora ya no tiene mesas libres" });
  if (result === "unavailable") throw new TRPCError({ code: "BAD_REQUEST", message: "Esa hora no se puede reservar" });

  await announceReservations({
    db: input.db,
    env: input.env,
    reservationIds: [result.id],
    event: { kind: "booked" },
  });
  return { id: result.id, startsAt: result.startsAt };
}

export async function getGuestReservations({
  email,
  ...input
}: PublicInput & { email: string }): Promise<GuestReservation[]> {
  const tenant = await resolveReservationTenant(input);
  await throttle({ ...input, tenant });

  return listGuestReservations({ db: input.db, branchId: tenant.branchId, email });
}

/** ADR 0008: the manage link carries the reservation id; it opens that guest's reservations like their email does. */
export async function getEmailFromLink({
  reservationId,
  ...input
}: PublicInput & { reservationId: string }): Promise<{ email: string }> {
  const tenant = await resolveReservationTenant(input);
  await throttle({ ...input, tenant });

  const email = await findGuestEmail({ db: input.db, branchId: tenant.branchId, reservationId });
  if (!email) throw new TRPCError({ code: "NOT_FOUND", message: "Este enlace ya no es válido" });

  return { email };
}

export async function answerPublicReservation({
  email,
  reservationId,
  answer,
  ...input
}: PublicInput & { email: string; reservationId: string; answer: "confirm" | "cancel" }): Promise<void> {
  const tenant = await resolveReservationTenant(input);
  await throttle({ ...input, tenant });

  const row = await answerGuestReservation({ db: input.db, branchId: tenant.branchId, email, reservationId, answer });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Esta reserva ya no se puede cambiar" });

  if (answer === "cancel") {
    await announceReservations({
      db: input.db,
      env: input.env,
      reservationIds: [row.id],
      event: { kind: "cancelled", by: "guest" },
    });
  }
}
