import { getLocalDayAndMinute } from "@qmenut/db/domain/local-time";
import {
  addClosure,
  answerReservation,
  cancelReservationByStaff,
  countPendingReservations,
  findReservation,
  getReservationSettings,
  listDayReservations,
  listUpcomingClosures,
  removeClosure,
  saveReservationSettings,
} from "@qmenut/db/repositories/reservations.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFeature } from "../../lib/billing/entitlement";
import { bumpPublicContentVersionForBranch } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";
import { acceptOverdueReservations } from "../reservations/accept-overdue-reservations";

import type { TenantContext } from "../../trpc/trpc";
import type { DrizzleDb } from "@qmenut/db/client";
import type { ReservationSettingsValues } from "@qmenut/db/repositories/reservations.repository";

/** What a branch that never saved its settings starts from (the design's defaults; capacity is the owner's call). */
const DEFAULT_SETTINGS: Omit<ReservationSettingsValues, "slotCapacity"> & { slotCapacity: number | null } = {
  isEnabled: false,
  slotCapacity: null,
  onlinePartyLimit: 8,
  windowDays: 30,
  leadTimeMinutes: 120,
  responseTimeMinutes: 720,
  checkBeforeMinutes: 120,
  checkDeadlineMinutes: 45,
};

const branchInputSchema = z.object({ branchId: z.string().trim().min(1) });
const reservationInputSchema = z.object({ reservationId: z.string().trim().min(1) });
const minuteSchema = z.number().int().min(0).max(1439);
const weekdaySchema = z.number().int().min(0).max(6);
const slotSchema = z.object({ weekday: weekdaySchema, startMinute: minuteSchema });
const dayInputSchema = branchInputSchema.extend({ date: z.iso.date().optional() });
const closureIdInputSchema = branchInputSchema.extend({ closureId: z.string().trim().min(1) });

const settingsInputSchema = branchInputSchema.extend({
  isEnabled: z.boolean(),
  slotCapacity: z.number().int().min(1).max(500),
  onlinePartyLimit: z.number().int().min(1).max(50),
  windowDays: z.number().int().min(1).max(365),
  leadTimeMinutes: z
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 60),
  responseTimeMinutes: z
    .number()
    .int()
    .min(15)
    .max(7 * 24 * 60),
  checkBeforeMinutes: z
    .number()
    .int()
    .min(30)
    .max(48 * 60),
  checkDeadlineMinutes: z
    .number()
    .int()
    .min(0)
    .max(48 * 60),
  slots: z
    .array(slotSchema)
    .max(7 * 48)
    .refine((slots) => new Set(slots.map((slot) => `${slot.weekday}:${slot.startMinute}`)).size === slots.length, {
      message: "Hay horas repetidas en el mismo día",
    }),
});

const closureInputSchema = branchInputSchema.extend({ date: z.iso.date(), startMinute: minuteSchema.nullable() });

interface AccessContext {
  db: DrizzleDb;
  tenant: TenantContext;
}

/** Every procedure: the permission, the branch belongs to the restaurant, and that branch's plan has reservations. */
async function assertReservationsBranch(ctx: AccessContext, branchId: string) {
  requirePermission(ctx.tenant, "reservations.manage");
  await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId });
  await requireFeature(ctx, { feature: "reservations", branchId });
}

async function resolveReservation(ctx: AccessContext, reservationId: string) {
  const reservation = await findReservation({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, reservationId });
  if (!reservation) throw new TRPCError({ code: "NOT_FOUND", message: "Reserva no encontrada" });

  await assertReservationsBranch(ctx, reservation.branchId);
  return reservation;
}

/** Staff see days in the restaurant's timezone, wherever their device is. */
async function getRestaurantToday(ctx: AccessContext): Promise<string> {
  const restaurant = await getRestaurantById({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });

  return getLocalDayAndMinute({ nowMs: Date.now(), timeZone: restaurant?.timezone ?? "Europe/Madrid" }).date;
}

const ANSWERED = new TRPCError({ code: "CONFLICT", message: "Otra persona ya respondió esta reserva" });

export const adminReservationsRouter = router({
  day: tenantProcedure.input(dayInputSchema).query(async ({ ctx, input }) => {
    await assertReservationsBranch(ctx, input.branchId);
    await acceptOverdueReservations({ db: ctx.db, branchId: input.branchId });

    const today = await getRestaurantToday(ctx);
    const date = input.date ?? today;
    const [{ settings }, reservations] = await Promise.all([
      getReservationSettings({ db: ctx.db, branchId: input.branchId }),
      listDayReservations({ db: ctx.db, branchId: input.branchId, date }),
    ]);

    return { date, today, slotCapacity: settings?.slotCapacity ?? null, reservations };
  }),
  pendingCount: tenantProcedure.input(branchInputSchema).query(async ({ ctx, input }) => {
    await assertReservationsBranch(ctx, input.branchId);
    await acceptOverdueReservations({ db: ctx.db, branchId: input.branchId });

    return countPendingReservations({ db: ctx.db, branchId: input.branchId });
  }),
  accept: tenantProcedure.input(reservationInputSchema).mutation(async ({ ctx, input }) => {
    await resolveReservation(ctx, input.reservationId);
    const row = await answerReservation({
      db: ctx.db,
      reservationId: input.reservationId,
      handledBy: ctx.tenant.membershipId,
      status: "accepted",
    });
    if (!row) throw ANSWERED;
  }),
  decline: tenantProcedure.input(reservationInputSchema).mutation(async ({ ctx, input }) => {
    await resolveReservation(ctx, input.reservationId);
    const row = await answerReservation({
      db: ctx.db,
      reservationId: input.reservationId,
      handledBy: ctx.tenant.membershipId,
      status: "declined",
    });
    if (!row) throw ANSWERED;
  }),
  cancel: tenantProcedure.input(reservationInputSchema).mutation(async ({ ctx, input }) => {
    await resolveReservation(ctx, input.reservationId);
    const row = await cancelReservationByStaff({
      db: ctx.db,
      reservationId: input.reservationId,
      handledBy: ctx.tenant.membershipId,
    });
    if (!row) throw new TRPCError({ code: "CONFLICT", message: "Esta reserva ya no ocupa mesa" });
  }),
  settings: tenantProcedure.input(branchInputSchema).query(async ({ ctx, input }) => {
    await assertReservationsBranch(ctx, input.branchId);
    const { settings, slots } = await getReservationSettings({ db: ctx.db, branchId: input.branchId });

    return { settings: settings ?? DEFAULT_SETTINGS, slots };
  }),
  saveSettings: tenantProcedure.input(settingsInputSchema).mutation(async ({ ctx, input }) => {
    const { branchId, slots, ...values } = input;
    await assertReservationsBranch(ctx, branchId);

    if (values.checkDeadlineMinutes >= values.checkBeforeMinutes) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "El plazo para confirmar debe acabar después de enviar la confirmación",
      });
    }

    await saveReservationSettings({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId, values, slots });
    // The public tab and sitemap follow the switch and the slots.
    await bumpPublicContentVersionForBranch({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      branchId,
    });
  }),
  closures: tenantProcedure.input(branchInputSchema).query(async ({ ctx, input }) => {
    await assertReservationsBranch(ctx, input.branchId);
    return listUpcomingClosures({ db: ctx.db, branchId: input.branchId, fromDate: await getRestaurantToday(ctx) });
  }),
  addClosure: tenantProcedure.input(closureInputSchema).mutation(async ({ ctx, input }) => {
    await assertReservationsBranch(ctx, input.branchId);
    const added = await addClosure({ db: ctx.db, ...input, createdBy: ctx.tenant.membershipId });

    if (!added) throw new TRPCError({ code: "CONFLICT", message: "Ya está cerrado" });
  }),
  removeClosure: tenantProcedure.input(closureIdInputSchema).mutation(async ({ ctx, input }) => {
    await assertReservationsBranch(ctx, input.branchId);
    await removeClosure({ db: ctx.db, branchId: input.branchId, closureId: input.closureId });
  }),
});
