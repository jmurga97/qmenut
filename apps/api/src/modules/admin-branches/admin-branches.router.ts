import { z } from "zod";

import { getBranchSettings } from "./get-branch-settings";
import { saveBranchSettingsSchema } from "./branch-input.schema";
import { saveBranchSettings } from "./save-branch-settings";
import { requireRole } from "../admin-tenant/require-role";
import { router, tenantProcedure } from "../../trpc/trpc";

const WRITE_ROLES = ["owner", "admin"] as const;
const branchIdSchema = z.object({ branchId: z.string().trim().min(1) });

export const adminBranchesRouter = router({
  get: tenantProcedure
    .input(branchIdSchema)
    .query(({ ctx, input }) =>
      getBranchSettings({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId }),
    ),
  save: tenantProcedure.input(saveBranchSettingsSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    await saveBranchSettings({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      info: input.info,
      schedules: input.schedules,
      photos: input.photos,
    });
    return { id: input.branchId };
  }),
});
