import { can } from "@qmenut/permissions";
import { TRPCError } from "@trpc/server";

import type { TenantContext } from "../../trpc/trpc";
import type { Permission } from "@qmenut/permissions";

export function requirePermission(tenant: TenantContext, permission: Permission): void {
  if (!can(tenant.roleCode, permission)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "El rol no tiene permisos suficientes" });
  }
}
