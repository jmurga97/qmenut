import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";
import {
  countInboxBadge,
  getPushDeviceBranchIds,
  listInbox,
  markAllNotificationsRead,
  markNotificationsRead,
  removePushDevice,
  upsertPushDevice,
} from "@qmenut/db/repositories/notifications.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getVapidKeys } from "./events";
import { router, tenantProcedure } from "../../trpc/trpc";

const id = z.string().trim().min(1);
const branchInputSchema = z.object({ branchId: id });
const markReadInputSchema = z.object({ ids: z.array(id).min(1).max(200) });
const endpointSchema = z.url({ protocol: /^https$/ }).max(2048);

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
  device: tenantProcedure.input(z.object({ endpoint: endpointSchema })).query(async ({ ctx, input }) => ({
    branchIds: await getPushDeviceBranchIds({
      db: ctx.db,
      membershipId: ctx.tenant.membershipId,
      endpoint: input.endpoint,
    }),
  })),
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
