export interface ResolvedTenant {
  branchId: string;
  restaurantId: string;
}

interface BranchTenantRow {
  id: string;
  restaurant_id: string;
}

function getRequestHostname(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    return host.split(":")[0] ?? host;
  }

  return new URL(request.url).hostname;
}

export async function resolveTenantFromRequest(db: D1Database, request: Request): Promise<ResolvedTenant | null> {
  const host = getRequestHostname(request);
  const row = await db
    .prepare("SELECT id, restaurant_id FROM branches WHERE custom_domain = ? AND deleted_at IS NULL AND is_active = 1")
    .bind(host)
    .first<BranchTenantRow>();

  if (!row) {
    return null;
  }

  return { branchId: row.id, restaurantId: row.restaurant_id };
}
