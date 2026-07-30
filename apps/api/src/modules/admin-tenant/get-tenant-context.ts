import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";
import { TRPCError } from "@trpc/server";

import type { TenantContext } from "../../trpc/trpc";
import type { DrizzleDb } from "@qmenut/db/client";
import type { AdminBranchSummary } from "@qmenut/db/repositories/admin-branches.repository";
import type { RestaurantRoleCode } from "@qmenut/db/repositories/restaurant-users.repository";
import type { RestaurantSummary } from "@qmenut/db/repositories/restaurants.repository";

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
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurante no encontrado" });
  }

  return {
    restaurant,
    branches,
    roleCode: tenant.roleCode,
  };
}
