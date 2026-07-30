import { z } from "zod";

import { saveBranchSettingsSchema } from "./branch-input.schema";
import { getBranchSettings } from "./get-branch-settings";
import { saveBranchSettings } from "./save-branch-settings";
import { bumpPublicContentVersionForRestaurant } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { requirePermission } from "../admin-tenant/require-permission";

const branchIdSchema = z.object({ branchId: z.string().trim().min(1) });

export const adminBranchesRouter = router({
  get: tenantProcedure
    .input(branchIdSchema)
    .query(({ ctx, input }) =>
      getBranchSettings({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId }),
    ),
  save: tenantProcedure.input(saveBranchSettingsSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "branch.write");
    await saveBranchSettings({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      timezone: input.timezone,
      info: input.info,
      schedules: input.schedules,
      photos: input.photos,
    });
    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });
    return { id: input.branchId };
  }),
});
