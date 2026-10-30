import { and, asc, between, count, eq, gt, inArray, lte, sql } from "drizzle-orm";

import { addDays, getLocalDayAndMinute, getWeekday, localToUtc } from "../domain/local-time";
import { reservationClosures, reservationSettings, reservationSlots, reservations } from "../schema/reservations";
import { branches, restaurants } from "../schema/tenancy";

import type { DrizzleDb } from "../client";

export type ReservationRow = typeof reservations.$inferSelect;
export type ReservationSettingsRow = typeof reservationSettings.$inferSelect;

/** Statuses that keep a table: one reservation is one table, whatever the party size. */
export const HOLDING_STATUSES = ["pending", "accepted", "confirmed", "unconfirmed"] as const;

const MINUTE_MS = 60_000;

interface BranchInput {
  db: DrizzleDb;
  branchId: string;
}

interface BookingContext {
  settings: ReservationSettingsRow;
  timeZone: string;
}

async function getBookingContext({ db, branchId }: BranchInput): Promise<BookingContext | null> {
  const row = await db
    .select({ settings: reservationSettings, timeZone: restaurants.timezone })
    .from(reservationSettings)
    .innerJoin(restaurants, eq(restaurants.id, reservationSettings.restaurantId))
    .where(eq(reservationSettings.branchId, branchId))
    .get();

  return row ?? null;
}

/** First and last local dates guests can book, today included. */
function getBookingWindow({ settings, timeZone }: BookingContext, now: number): { first: string; last: string } {
  const today = getLocalDayAndMinute({ nowMs: now, timeZone }).date;

  return { first: today, last: addDays(today, settings.windowDays) };
}

export type AvailabilityDayState = "available" | "full" | "unavailable";

export interface AvailabilitySlot {
  minute: number;
  startsAt: number;
  freeTables: number;
}

export interface AvailabilityDay {
  date: string;
  state: AvailabilityDayState;
  /** Bookable slots only; full ones stay listed with no free tables. */
  slots: AvailabilitySlot[];
}

interface AvailabilityInput extends BranchInput {
  /** Local YYYY-MM-DD, both inclusive. The caller bounds the span. */
  from: string;
  to: string;
  now?: number;
}

interface DayInput {
  context: BookingContext;
  date: string;
  minutes: number[];
  closedMinutes: Set<number | null>;
  held: Map<number, number>;
  earliestStart: number;
}

function buildDay({ context, date, minutes, closedMinutes, held, earliestStart }: DayInput): AvailabilityDay {
  if (closedMinutes.has(null)) return { date, state: "unavailable", slots: [] };

  const slots = minutes
    .filter((minute) => !closedMinutes.has(minute))
    .map((minute) => ({
      minute,
      startsAt: localToUtc({ date, minute, timeZone: context.timeZone }),
      freeTables: Math.max(0, context.settings.slotCapacity - (held.get(minute) ?? 0)),
    }))
    .filter((slot) => slot.startsAt >= earliestStart);

  if (slots.length === 0) return { date, state: "unavailable", slots };

  return { date, state: slots.some((slot) => slot.freeTables > 0) ? "available" : "full", slots };
}

export async function getAvailability({
  db,
  branchId,
  from,
  to,
  now = Date.now(),
}: AvailabilityInput): Promise<AvailabilityDay[]> {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);

  const context = await getBookingContext({ db, branchId });
  if (!context?.settings.isEnabled) return dates.map((date) => ({ date, state: "unavailable", slots: [] }));

  const slotsQuery = db.select().from(reservationSlots).where(eq(reservationSlots.branchId, branchId)).all();
  const closuresQuery = db
    .select({ date: reservationClosures.date, startMinute: reservationClosures.startMinute })
    .from(reservationClosures)
    .where(and(eq(reservationClosures.branchId, branchId), between(reservationClosures.date, from, to)))
    .all();
  const heldQuery = db
    .select({ date: reservations.slotDate, minute: reservations.slotMinute, tables: count() })
    .from(reservations)
    .where(
      and(
        eq(reservations.branchId, branchId),
        between(reservations.slotDate, from, to),
        inArray(reservations.status, HOLDING_STATUSES),
      ),
    )
    .groupBy(reservations.slotDate, reservations.slotMinute)
    .all();
  const [slots, closures, held] = await Promise.all([slotsQuery, closuresQuery, heldQuery]);

  const window = getBookingWindow(context, now);
  const earliestStart = now + context.settings.leadTimeMinutes * MINUTE_MS;

  return dates.map((date) => {
    const minutes = slots.filter((slot) => slot.weekday === getWeekday(date)).map((slot) => slot.startMinute);

    if (date < window.first || date > window.last || minutes.length === 0) {
      return { date, state: "unavailable", slots: [] };
    }

    return buildDay({
      context,
      date,
      minutes: minutes.toSorted((a, b) => a - b),
      closedMinutes: new Set(closures.filter((closure) => closure.date === date).map((closure) => closure.startMinute)),
      held: new Map(held.filter((row) => row.date === date).map((row) => [row.minute, row.tables])),
      earliestStart,
    });
  });
}

export interface CreateReservationInput extends BranchInput {
  date: string;
  minute: number;
  partySize: number;
  guestName: string;
  /** E.164, normalized by the caller. */
  guestPhone: string;
  guestEmail: string;
  guestLanguage: string;
  now?: number;
}

/**
 * One INSERT … SELECT decides capacity, the weekly slot and closures: a single statement is atomic in D1, so
 * two guests racing for the last table cannot both get it.
 */
export async function createReservation({
  db,
  branchId,
  date,
  minute,
  partySize,
  guestName,
  guestPhone,
  guestEmail,
  guestLanguage,
  now = Date.now(),
}: CreateReservationInput): Promise<"unavailable" | "full" | Pick<ReservationRow, "id" | "startsAt" | "respondBy">> {
  const context = await getBookingContext({ db, branchId });
  if (!context?.settings.isEnabled || partySize > context.settings.onlinePartyLimit) return "unavailable";

  const { settings, timeZone } = context;
  const window = getBookingWindow(context, now);
  const startsAt = localToUtc({ date, minute, timeZone });
  const latestAnswer = startsAt - settings.leadTimeMinutes * MINUTE_MS;

  if (date < window.first || date > window.last || now > latestAnswer) return "unavailable";

  const id = crypto.randomUUID();
  // ADR 0005: staff answer within the response time, and always before the lead time starts.
  const respondBy = Math.min(now + settings.responseTimeMinutes * MINUTE_MS, latestAnswer);
  const holding = sql.join(
    HOLDING_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  );

  const insert = await db.run(sql`
    INSERT INTO reservations
      (id, restaurant_id, branch_id, slot_date, slot_minute, starts_at, party_size, guest_name, guest_phone,
       guest_email, guest_language, status, auto_accepted, respond_by, consent_at, created_at, updated_at)
    SELECT ${id}, ${settings.restaurantId}, ${branchId}, ${date}, ${minute}, ${startsAt}, ${partySize},
      ${guestName.trim()}, ${guestPhone}, ${guestEmail.trim().toLowerCase()}, ${guestLanguage}, 'pending', 0,
      ${respondBy}, ${now}, ${now}, ${now}
    WHERE EXISTS (
        SELECT 1 FROM reservation_slots
        WHERE branch_id = ${branchId} AND weekday = ${getWeekday(date)} AND start_minute = ${minute}
      )
      AND NOT EXISTS (
        SELECT 1 FROM reservation_closures
        WHERE branch_id = ${branchId} AND date = ${date} AND (start_minute IS NULL OR start_minute = ${minute})
      )
      AND (
        SELECT COUNT(*) FROM reservations
        WHERE branch_id = ${branchId} AND slot_date = ${date} AND slot_minute = ${minute} AND status IN (${holding})
      ) < (SELECT slot_capacity FROM reservation_settings WHERE branch_id = ${branchId} AND is_enabled = 1)
  `);

  if (insert.meta.changes === 1) return { id, startsAt, respondBy };

  // Tell a slot that filled up apart from one that was never bookable (no such slot, closed, turned off).
  const [held] = await db
    .select({ tables: count() })
    .from(reservations)
    .where(
      and(
        eq(reservations.branchId, branchId),
        eq(reservations.slotDate, date),
        eq(reservations.slotMinute, minute),
        inArray(reservations.status, HOLDING_STATUSES),
      ),
    );

  return held.tables >= settings.slotCapacity ? "full" : "unavailable";
}

interface AcceptOverdueReservationsInput {
  db: DrizzleDb;
  /** Omitted by the minute cron, which sweeps every branch. */
  branchId?: string;
  now?: number;
}

/**
 * ADR 0005: a request nobody answered by `respond_by` is accepted. Reads that show pending reservations call this
 * as well as the cron; every caller sends the "accepted" email and handles the notification for the rows returned.
 */
export async function acceptOverdueReservations({
  db,
  branchId,
  now = Date.now(),
}: AcceptOverdueReservationsInput): Promise<ReservationRow[]> {
  return db
    .update(reservations)
    .set({ status: "accepted", autoAccepted: true, handledAt: now, updatedAt: now })
    .where(
      and(
        branchId ? eq(reservations.branchId, branchId) : undefined,
        eq(reservations.status, "pending"),
        lte(reservations.respondBy, now),
      ),
    )
    .returning();
}

/** The public gate: turned on and at least one weekly slot. The plan check stays with the caller. */
export async function isReservationsOpen({ db, branchId }: BranchInput): Promise<boolean> {
  const row = await db
    .select({ branchId: reservationSettings.branchId })
    .from(reservationSettings)
    .innerJoin(reservationSlots, eq(reservationSlots.branchId, reservationSettings.branchId))
    .where(and(eq(reservationSettings.branchId, branchId), eq(reservationSettings.isEnabled, true)))
    .limit(1)
    .get();

  return row !== undefined;
}

export interface BookingInfo {
  timeZone: string;
  onlinePartyLimit: number;
  windowDays: number;
  /** Free text from the branch: larger groups are asked to call. */
  phone: string | null;
}

export async function getBookingInfo({ db, branchId }: BranchInput): Promise<BookingInfo | null> {
  const row = await db
    .select({
      timeZone: restaurants.timezone,
      onlinePartyLimit: reservationSettings.onlinePartyLimit,
      windowDays: reservationSettings.windowDays,
      phone: branches.phone,
    })
    .from(reservationSettings)
    .innerJoin(restaurants, eq(restaurants.id, reservationSettings.restaurantId))
    .innerJoin(branches, eq(branches.id, reservationSettings.branchId))
    .where(eq(reservationSettings.branchId, branchId))
    .get();

  return row ?? null;
}

export type GuestReservation = Pick<
  ReservationRow,
  "id" | "slotDate" | "slotMinute" | "startsAt" | "partySize" | "status" | "cancelledBy"
>;

interface GuestReservationsInput extends BranchInput {
  email: string;
  now?: number;
}

/** ADR 0004: the email alone opens them. Past slots and anonymized rows drop out on their own. */
export async function listGuestReservations({
  db,
  branchId,
  email,
  now = Date.now(),
}: GuestReservationsInput): Promise<GuestReservation[]> {
  const guestEmail = email.trim().toLowerCase();

  return db
    .select({
      id: reservations.id,
      slotDate: reservations.slotDate,
      slotMinute: reservations.slotMinute,
      startsAt: reservations.startsAt,
      partySize: reservations.partySize,
      status: reservations.status,
      cancelledBy: reservations.cancelledBy,
    })
    .from(reservations)
    .where(
      and(eq(reservations.branchId, branchId), eq(reservations.guestEmail, guestEmail), gt(reservations.startsAt, now)),
    )
    .orderBy(asc(reservations.startsAt))
    .limit(20)
    .all();
}

interface CancelGuestReservationInput extends GuestReservationsInput {
  reservationId: string;
}

/** Guests cancel until the slot starts. Returns the cancelled row for the emails, or null. */
export async function cancelGuestReservation({
  db,
  branchId,
  email,
  reservationId,
  now = Date.now(),
}: CancelGuestReservationInput): Promise<ReservationRow | null> {
  const guestEmail = email.trim().toLowerCase();
  const [row] = await db
    .update(reservations)
    .set({ status: "cancelled", cancelledBy: "guest", updatedAt: now })
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.branchId, branchId),
        eq(reservations.guestEmail, guestEmail),
        inArray(reservations.status, HOLDING_STATUSES),
        gt(reservations.startsAt, now),
      ),
    )
    .returning();

  return row ?? null;
}
