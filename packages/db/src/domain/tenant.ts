export interface ResolvedTenant {
  branchId: string;
  restaurantId: string;
}

export function normalizeTenantHost(host: string): string {
  const trimmed = host.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);

    return url.hostname;
  } catch {
    return trimmed.split("/")[0]?.split(":")[0] ?? trimmed;
  }
}
