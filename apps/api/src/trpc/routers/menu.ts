import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { branches } from "@/db";
import { resolveTenantFromRequest } from "@/tenant/resolve-tenant";

import { publicProcedure, router } from "../trpc";

interface BranchRow {
  address: string | null;
  currency: string;
  customDomain: string | null;
  id: string;
  name: string;
  phone: string | null;
  socialLinksJson: string | null;
  whatsapp: string | null;
}

function parseSocialLinks(socialLinksJson: string | null): unknown {
  if (!socialLinksJson) {
    return null;
  }

  try {
    return JSON.parse(socialLinksJson) as unknown;
  } catch {
    return null;
  }
}

function mapBranch(row: BranchRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    socialLinks: parseSocialLinks(row.socialLinksJson),
    customDomain: row.customDomain,
    currency: row.currency,
  };
}

export const menuRouter = router({
  branch: publicProcedure.query(async ({ ctx }) => {
    const tenant = await resolveTenantFromRequest(ctx.env.DB, ctx.request);

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No branch is mapped to this host",
      });
    }

    const row = await ctx.db
      .select({
        id: branches.id,
        name: branches.name,
        address: branches.address,
        phone: branches.phone,
        whatsapp: branches.whatsapp,
        socialLinksJson: branches.socialLinksJson,
        customDomain: branches.customDomain,
        currency: branches.currency,
      })
      .from(branches)
      .where(
        and(
          eq(branches.id, tenant.branchId),
          eq(branches.restaurantId, tenant.restaurantId),
          isNull(branches.deletedAt),
          eq(branches.isActive, true),
        ),
      )
      .get();

    if (!row) {
      return null;
    }

    return mapBranch(row);
  }),
});
