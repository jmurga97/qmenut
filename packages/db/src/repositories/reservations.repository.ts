import { isInternalSupportEmail } from "@qmenut/permissions";
import { and, asc, between, count, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";

import { addDays, getLocalDayAndMinute, getWeekday, localToUtc } from "../domain/local-time";
import { users } from "../schema/auth";
import { notifications } from "../schema/notifications";
import { reservationClosures, reservationSettings, reservationSlots, reservations } from "../schema/reservations";
import { branches, restaurants, restaurantUsers } from "../schema/tenancy";

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

interface RestaurantBranchInput extends BranchInput {
  restaurantId: string;
}

/** One day's reservations for staff, every status, with the guest's contact details. */
export async function listDayReservations({
  db,
  branchId,
  date,
}: BranchInput & { date: string }): Promise<ReservationRow[]> {
  return db
    .select()
    .from(reservations)
    .where(and(eq(reservations.branchId, branchId), eq(reservations.slotDate, date)))
    .orderBy(asc(reservations.slotMinute), asc(reservations.createdAt))
    .all();
}

export async function countPendingReservations({ db, branchId }: BranchInput): Promise<number> {
  const [row] = await db
    .select({ pending: count() })
    .from(reservations)
    .where(and(eq(reservations.branchId, branchId), eq(reservations.status, "pending")));

  return row.pending;
}

export async function findReservation({
  db,
  restaurantId,
  reservationId,
}: {
  db: DrizzleDb;
  restaurantId: string;
  reservationId: string;
}): Promise<ReservationRow | null> {
  const row = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.id, reservationId), eq(reservations.restaurantId, restaurantId)))
    .get();

  return row ?? null;
}

interface StaffTransitionInput {
  db: DrizzleDb;
  reservationId: string;
  handledBy: string;
  now?: number;
}

/** Accept or decline a pending request. Null when another device or the automatic acceptance answered first. */
export async function answerReservation({
  db,
  reservationId,
  handledBy,
  status,
  now = Date.now(),
}: StaffTransitionInput & { status: "accepted" | "declined" }): Promise<ReservationRow | null> {
  const [row] = await db
    .update(reservations)
    .set({ status, handledBy, handledAt: now, updatedAt: now })
    .where(and(eq(reservations.id, reservationId), eq(reservations.status, "pending"), gt(reservations.respondBy, now)))
    .returning();

  return row ?? null;
}

/** Staff cancel any reservation that still holds a table, frees it. Null when it no longer does. */
export async function cancelReservationByStaff({
  db,
  reservationId,
  handledBy,
  now = Date.now(),
}: StaffTransitionInput): Promise<ReservationRow | null> {
  const [row] = await db
    .update(reservations)
    .set({ status: "cancelled", cancelledBy: "staff", handledBy, handledAt: now, updatedAt: now })
    .where(and(eq(reservations.id, reservationId), inArray(reservations.status, HOLDING_STATUSES)))
    .returning();

  return row ?? null;
}

export type ReservationSettingsValues = Omit<ReservationSettingsRow, "branchId" | "restaurantId" | "updatedAt">;

export interface ReservationSlot {
  weekday: number;
  startMinute: number;
}

export async function getReservationSettings({
  db,
  branchId,
}: BranchInput): Promise<{ settings: ReservationSettingsRow | null; slots: ReservationSlot[] }> {
  const settingsQuery = db.select().from(reservationSettings).where(eq(reservationSettings.branchId, branchId)).get();
  const slotsQuery = db
    .select({ weekday: reservationSlots.weekday, startMinute: reservationSlots.startMinute })
    .from(reservationSlots)
    .where(eq(reservationSlots.branchId, branchId))
    .orderBy(asc(reservationSlots.weekday), asc(reservationSlots.startMinute))
    .all();
  const [settings, slots] = await Promise.all([settingsQuery, slotsQuery]);

  return { settings: settings ?? null, slots };
}

/** Settings and the weekly slots in one batch, so the public gate never sees half of a save. */
export async function saveReservationSettings({
  db,
  restaurantId,
  branchId,
  values,
  slots,
}: RestaurantBranchInput & { values: ReservationSettingsValues; slots: ReservationSlot[] }): Promise<void> {
  const now = Date.now();
  const upsert = db
    .insert(reservationSettings)
    .values({ ...values, branchId, restaurantId, updatedAt: now })
    .onConflictDoUpdate({ target: reservationSettings.branchId, set: { ...values, updatedAt: now } });
  const clear = db.delete(reservationSlots).where(eq(reservationSlots.branchId, branchId));

  if (slots.length === 0) {
    await db.batch([upsert, clear]);
    return;
  }

  // Three parameters per slot; keep every insert below D1's 100-parameter limit.
  const inserts = Array.from({ length: Math.ceil(slots.length / 33) }, (_, index) =>
    db
      .insert(reservationSlots)
      .values(slots.slice(index * 33, (index + 1) * 33).map((slot) => ({ ...slot, branchId }))),
  );
  await db.batch([upsert, clear, ...inserts]);
}

export type ReservationClosure = Pick<typeof reservationClosures.$inferSelect, "id" | "date" | "startMinute">;

/** Today's and future closures; past ones stay for the record but drop out of the list. */
export async function listUpcomingClosures({
  db,
  branchId,
  fromDate,
}: BranchInput & { fromDate: string }): Promise<ReservationClosure[]> {
  return db
    .select({
      id: reservationClosures.id,
      date: reservationClosures.date,
      startMinute: reservationClosures.startMinute,
    })
    .from(reservationClosures)
    .where(and(eq(reservationClosures.branchId, branchId), gte(reservationClosures.date, fromDate)))
    .orderBy(asc(reservationClosures.date), asc(reservationClosures.startMinute))
    .all();
}

/** False when that day or slot is already closed. */
export async function addClosure({
  db,
  branchId,
  date,
  startMinute,
  createdBy,
}: BranchInput & { date: string; startMinute: number | null; createdBy: string }): Promise<boolean> {
  const result = await db
    .insert(reservationClosures)
    .values({ id: crypto.randomUUID(), branchId, date, startMinute, createdBy })
    .onConflictDoNothing()
    .run();

  return result.meta.changes === 1;
}

export async function removeClosure({ db, branchId, closureId }: BranchInput & { closureId: string }): Promise<void> {
  await db
    .delete(reservationClosures)
    .where(and(eq(reservationClosures.id, closureId), eq(reservationClosures.branchId, branchId)));
}

const ATTENDANCE_BATCH = 50;
const ANONYMIZE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;

export interface AttendanceCheck {
  id: string;
  guestName: string | null;
  guestPhone: string;
  slotDate: string;
  slotMinute: number;
  partySize: number;
  branchName: string;
}

/**
 * Accepted reservations inside their branch's check window: from `check_before` until `check_deadline` before
 * the slot. One accepted after the window opened is sent at once; one accepted after the deadline is skipped.
 */
export async function listAttendanceChecksDue({
  db,
  now = Date.now(),
}: {
  db: DrizzleDb;
  now?: number;
}): Promise<AttendanceCheck[]> {
  const rows = await db
    .select({
      id: reservations.id,
      guestName: reservations.guestName,
      guestPhone: reservations.guestPhone,
      slotDate: reservations.slotDate,
      slotMinute: reservations.slotMinute,
      partySize: reservations.partySize,
      branchName: branches.name,
    })
    .from(reservations)
    .innerJoin(reservationSettings, eq(reservationSettings.branchId, reservations.branchId))
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .where(
      and(
        eq(reservations.status, "accepted"),
        isNull(reservations.checkSentAt),
        isNotNull(reservations.guestPhone),
        sql`${reservations.startsAt} - ${reservationSettings.checkBeforeMinutes} * ${MINUTE_MS} <= ${now}`,
        sql`${reservations.startsAt} - ${reservationSettings.checkDeadlineMinutes} * ${MINUTE_MS} > ${now}`,
      ),
    )
    .orderBy(asc(reservations.startsAt))
    .limit(ATTENDANCE_BATCH)
    .all();

  return rows.flatMap((row) => (row.guestPhone ? [{ ...row, guestPhone: row.guestPhone }] : []));
}

/** Claims the check before sending, so overlapping cron runs can't both send it. */
export async function claimAttendanceCheck({
  db,
  reservationId,
  now = Date.now(),
}: {
  db: DrizzleDb;
  reservationId: string;
  now?: number;
}): Promise<boolean> {
  const result = await db
    .update(reservations)
    .set({ checkSentAt: now, updatedAt: now })
    .where(and(eq(reservations.id, reservationId), isNull(reservations.checkSentAt)))
    .run();

  return result.meta.changes === 1;
}

/** Gives the check back to the next run after a send that may succeed if retried. */
export async function releaseAttendanceCheck({ db, reservationId }: { db: DrizzleDb; reservationId: string }) {
  await db
    .update(reservations)
    .set({ checkSentAt: null, updatedAt: Date.now() })
    .where(eq(reservations.id, reservationId));
}

/** Checked, unanswered and past the deadline: still holds its table, flagged for staff. */
export async function markUnconfirmedReservations({
  db,
  now = Date.now(),
}: {
  db: DrizzleDb;
  now?: number;
}): Promise<ReservationRow[]> {
  return db
    .update(reservations)
    .set({ status: "unconfirmed", updatedAt: now })
    .where(
      and(
        eq(reservations.status, "accepted"),
        isNotNull(reservations.checkSentAt),
        sql`${reservations.startsAt} - (
          SELECT ${reservationSettings.checkDeadlineMinutes} FROM ${reservationSettings}
          WHERE ${reservationSettings.branchId} = ${reservations.branchId}
        ) * ${MINUTE_MS} <= ${now}`,
      ),
    )
    .returning();
}

/** The guest's answer to the attendance check. Null when the reservation can no longer take it. */
export async function answerAttendanceCheck({
  db,
  reservationId,
  answer,
  now = Date.now(),
}: {
  db: DrizzleDb;
  reservationId: string;
  answer: "confirm" | "cancel";
  now?: number;
}): Promise<ReservationRow | null> {
  const update =
    answer === "confirm"
      ? db
          .update(reservations)
          .set({ status: "confirmed", updatedAt: now })
          .where(and(eq(reservations.id, reservationId), inArray(reservations.status, ["accepted", "unconfirmed"])))
      : db
          .update(reservations)
          .set({ status: "cancelled", cancelledBy: "guest", updatedAt: now })
          .where(
            and(
              eq(reservations.id, reservationId),
              inArray(reservations.status, HOLDING_STATUSES),
              gt(reservations.startsAt, now),
            ),
          );
  const [row] = await update.returning();

  return row ?? null;
}

/** Contact data goes 90 days after the slot; date, time and party size stay for the restaurant's numbers. */
export async function anonymizeOldReservations({ db, now = Date.now() }: { db: DrizzleDb; now?: number }) {
  const result = await db
    .update(reservations)
    .set({ guestName: null, guestPhone: null, guestEmail: null, anonymizedAt: now, updatedAt: now })
    .where(and(isNull(reservations.anonymizedAt), lt(reservations.startsAt, now - ANONYMIZE_AFTER_MS)))
    .run();

  return result.meta.changes;
}

/** What the reservation emails and notifications need, for one or more reservations. */
export interface ReservationMessage extends Pick<
  ReservationRow,
  | "id"
  | "restaurantId"
  | "branchId"
  | "slotDate"
  | "slotMinute"
  | "partySize"
  | "guestName"
  | "guestPhone"
  | "guestEmail"
  | "guestLanguage"
> {
  branchName: string;
  branchPhone: string | null;
  restaurantName: string;
  /** Active owners, never support accounts. */
  ownerEmails: string[];
}

export async function listReservationMessages({
  db,
  reservationIds,
}: {
  db: DrizzleDb;
  reservationIds: string[];
}): Promise<ReservationMessage[]> {
  if (reservationIds.length === 0) return [];

  if (reservationIds.length > 50) {
    const messages: ReservationMessage[] = [];
    for (let index = 0; index < reservationIds.length; index += 50) {
      messages.push(
        ...(await listReservationMessages({ db, reservationIds: reservationIds.slice(index, index + 50) })),
      );
    }
    return messages;
  }

  const rows = await db
    .select({
      id: reservations.id,
      restaurantId: reservations.restaurantId,
      branchId: reservations.branchId,
      slotDate: reservations.slotDate,
      slotMinute: reservations.slotMinute,
      partySize: reservations.partySize,
      guestName: reservations.guestName,
      guestPhone: reservations.guestPhone,
      guestEmail: reservations.guestEmail,
      guestLanguage: reservations.guestLanguage,
      branchName: branches.name,
      branchPhone: branches.phone,
      restaurantName: restaurants.name,
    })
    .from(reservations)
    .innerJoin(branches, eq(branches.id, reservations.branchId))
    .innerJoin(restaurants, eq(restaurants.id, reservations.restaurantId))
    .where(inArray(reservations.id, reservationIds))
    .all();
  const restaurantIds = [...new Set(rows.map((row) => row.restaurantId))];
  const owners = await db
    .select({ restaurantId: restaurantUsers.restaurantId, email: users.email })
    .from(restaurantUsers)
    .innerJoin(users, eq(users.id, restaurantUsers.userId))
    .where(
      and(
        inArray(restaurantUsers.restaurantId, restaurantIds),
        eq(restaurantUsers.roleCode, "owner"),
        eq(restaurantUsers.isActive, true),
      ),
    )
    .all();

  return rows.map((row) => ({
    ...row,
    ownerEmails: owners
      .filter((owner) => owner.restaurantId === row.restaurantId && !isInternalSupportEmail(owner.email))
      .map((owner) => owner.email),
  }));
}

/** Unconfirmed notifications whose slot has started: nothing is left for staff to chase. */
export async function handleStartedUnconfirmedNotifications({ db, now = Date.now() }: { db: DrizzleDb; now?: number }) {
  await db
    .update(notifications)
    .set({ handledAt: now, handledBy: null, handledOutcome: "expired" })
    .where(
      and(
        eq(notifications.type, "reservation.unconfirmed"),
        isNull(notifications.handledAt),
        sql`EXISTS (SELECT 1 FROM ${reservations} WHERE ${reservations.id} = ${notifications.subjectId}
          AND ${reservations.startsAt} <= ${now})`,
      ),
    );
}
