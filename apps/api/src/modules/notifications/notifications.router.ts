import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";
import {
  countInboxBadge,
  deletePushDeviceById,
  getPushDevice,
  listInbox,
  markAllNotificationsRead,
  markNotificationsRead,
  removePushDevice,
  upsertPushDevice,
} from "@qmenut/db/repositories/notifications.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getVapidKeys } from "./events";
import { sendWebPush } from "../../lib/web-push";
import { router, tenantProcedure } from "../../trpc/trpc";

const id = z.string().trim().min(1);
const branchInputSchema = z.object({ branchId: id });
const markReadInputSchema = z.object({ ids: z.array(id).min(1).max(200) });
const endpointSchema = z.url({ protocol: /^https$/ }).max(2048);

const TEST_PUSH_TEXT = {
  es: { title: "Notificaciones activadas", body: "Así se verán los avisos en este dispositivo." },
  en: { title: "Notifications are on", body: "This is how alerts will look on this device." },
} as const;

const saveDeviceInputSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  branchIds: z.array(id).min(1).max(50),
  language: z.enum(["es", "en"]),
});

/** Every member who can open the admin gets notifications: no plan feature and no permission. */
export const notificationsRouter = router({
  list: tenantProcedure
    .input(branchInputSchema)
    .query(({ ctx, input }) =>
      listInbox({ db: ctx.db, membershipId: ctx.tenant.membershipId, branchId: input.branchId }),
    ),
  badge: tenantProcedure
    .input(branchInputSchema)
    .query(({ ctx, input }) =>
      countInboxBadge({ db: ctx.db, membershipId: ctx.tenant.membershipId, branchId: input.branchId }),
    ),
  markRead: tenantProcedure
    .input(markReadInputSchema)
    .mutation(({ ctx, input }) =>
      markNotificationsRead({ db: ctx.db, membershipId: ctx.tenant.membershipId, ids: input.ids }),
    ),
  markAllRead: tenantProcedure
    .input(branchInputSchema)
    .mutation(({ ctx, input }) =>
      markAllNotificationsRead({ db: ctx.db, membershipId: ctx.tenant.membershipId, branchId: input.branchId }),
    ),
  pushConfig: tenantProcedure.query(({ ctx }) => ({ publicKey: getVapidKeys(ctx.env)?.publicKey ?? null })),
  device: tenantProcedure.input(z.object({ endpoint: endpointSchema })).query(async ({ ctx, input }) => {
    const device = await getPushDevice({ db: ctx.db, membershipId: ctx.tenant.membershipId, endpoint: input.endpoint });

    return { branchIds: device?.branchIds ?? null, language: device?.language ?? null };
  }),
  /** Sent at once, not queued: the member is looking at the screen and wants to know it works. */
  sendTestPush: tenantProcedure.input(z.object({ endpoint: endpointSchema })).mutation(async ({ ctx, input }) => {
    const vapid = getVapidKeys(ctx.env);
    const device = await getPushDevice({ db: ctx.db, membershipId: ctx.tenant.membershipId, endpoint: input.endpoint });

    if (!vapid || !device) throw new TRPCError({ code: "NOT_FOUND", message: "Dispositivo no encontrado" });

    const result = await sendWebPush({
      subscription: device,
      payload: JSON.stringify({ ...TEST_PUSH_TEXT[device.language], url: "/notifications", tag: "test" }),
      vapid,
      ttlSeconds: 60,
    });

    if (result.status === 404 || result.status === 410) {
      await deletePushDeviceById({ db: ctx.db, id: device.id });
      throw new TRPCError({ code: "NOT_FOUND", message: "La suscripción de este dispositivo caducó" });
    }
    if (result.status >= 400) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: `El servicio push respondió ${result.status}` });
    }
  }),
  saveDevice: tenantProcedure.input(saveDeviceInputSchema).mutation(async ({ ctx, input }) => {
    const branches = await listBranches({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });
    const ownBranchIds = new Set(branches.map((branch) => branch.id));

    if (!input.branchIds.every((branchId) => ownBranchIds.has(branchId))) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
    }

    await upsertPushDevice({
      db: ctx.db,
      membershipId: ctx.tenant.membershipId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      language: input.language,
      branchIds: [...new Set(input.branchIds)],
    });
  }),
  removeDevice: tenantProcedure
    .input(z.object({ endpoint: endpointSchema }))
    .mutation(({ ctx, input }) =>
      removePushDevice({ db: ctx.db, membershipId: ctx.tenant.membershipId, endpoint: input.endpoint }),
    ),
});
