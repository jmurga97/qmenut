import { TRPCError } from "@trpc/server";

import type { RestaurantRoleCode } from "@qmenut/db/repositories/restaurant-users.repository";
import type { TenantContext } from "../../trpc/trpc";

export function requireRole(tenant: TenantContext, roles: readonly RestaurantRoleCode[]): void {
  if (!roles.includes(tenant.roleCode)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient role" });
  }
}
