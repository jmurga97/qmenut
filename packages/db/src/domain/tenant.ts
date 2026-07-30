import type { DrizzleDb } from "../client";

export interface ResolvedTenant {
  branchId: string;
  restaurantId: string;
}

export interface TenantInput {
  db: DrizzleDb;
  tenant: ResolvedTenant;
}

export interface IdsInput {
  db: DrizzleDb;
  ids: string[];
}

export interface TenantIdsInput extends TenantInput {
  ids: string[];
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
    return trimmed.split("/", 1)[0]?.split(":", 1)[0] ?? trimmed;
  }
}
