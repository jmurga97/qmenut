import { isBodyFontId, isHeadingFontId, QM_FONT_IDS } from "@qmenut/ui/theme/font-catalog";
import { z } from "zod";

import { bumpPublicContentVersionForBranch } from "../../lib/public-content-version";
import { getTheme, putTheme } from "../../lib/theme/theme-worker-client";
import { router, tenantProcedure } from "../../trpc/trpc";
import { requirePermission } from "../admin-tenant/require-permission";
import { resolveBranchHost } from "../admin-tenant/resolve-branch-host";

const branchIdSchema = z.object({ branchId: z.string().trim().min(1) });

const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: "Color hexadecimal no válido" });

const fontId = z.enum(QM_FONT_IDS);

const saveThemeSchema = z.object({
  branchId: z.string().trim().min(1),
  config: z.object({
    template: z.enum(["fine", "her", "fast", "cafe", "tapas"]),
    primary: hexColor,
    secondary: hexColor,
    tagline: z.string().trim().max(120).optional(),
    headingFont: fontId.refine(isHeadingFontId, { message: "La fuente no es válida para títulos" }).optional(),
    bodyFont: fontId.refine(isBodyFontId, { message: "La fuente no es válida para el cuerpo" }).optional(),
  }),
});

export const themeRouter = router({
  get: tenantProcedure.input(branchIdSchema).query(async ({ ctx, input }) => {
    const host = await resolveBranchHost({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    return getTheme(ctx.env, host);
  }),
  save: tenantProcedure.input(saveThemeSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "theme.write");
    const host = await resolveBranchHost({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    await putTheme({ config: input.config, env: ctx.env, host });
    await bumpPublicContentVersionForBranch({
      branchId: input.branchId,
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });
    return { host };
  }),
});
