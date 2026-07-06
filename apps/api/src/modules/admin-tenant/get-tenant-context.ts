import { TRPCError } from "@trpc/server";
import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";

import type { DrizzleDb } from "@qmenut/db";
import type { AdminBranchSummary } from "@qmenut/db/repositories/admin-branches.repository";
import type { RestaurantRoleCode } from "@qmenut/db/repositories/restaurant-users.repository";
import type { RestaurantSummary } from "@qmenut/db/repositories/restaurants.repository";
import type { TenantContext } from "../../trpc/trpc";

export interface AdminTenantContext {
  restaurant: RestaurantSummary;
  branches: AdminBranchSummary[];
  roleCode: RestaurantRoleCode;
}

interface GetTenantContextInput {
  db: DrizzleDb;
  tenant: TenantContext;
}

export async function getTenantContext({ db, tenant }: GetTenantContextInput): Promise<AdminTenantContext> {
  const [restaurant, branches] = await Promise.all([
    getRestaurantById({ db, restaurantId: tenant.restaurantId }),
    listBranches({ db, restaurantId: tenant.restaurantId }),
  ]);

  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
  }

  return {
    restaurant,
    branches,
    roleCode: tenant.roleCode,
  };
}
