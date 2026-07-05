import { resolveTenantFromRequest } from "../tenant/resolve-tenant";

import type { DrizzleDb } from "@qmenut/db";
import type { ResolvedTenant } from "@qmenut/db/domain/tenant";

interface ResolvePublicTenantInput {
  db: DrizzleDb;
  host?: string | undefined;
  request: Request;
}

export function resolvePublicTenant(input: ResolvePublicTenantInput): Promise<ResolvedTenant | null> {
  return resolveTenantFromRequest(input);
}
