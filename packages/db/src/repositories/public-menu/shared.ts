import type { DrizzleDb } from "../../client";

export interface ResolvedTenant {
  branchId: string;
  restaurantId: string;
}

export interface DbInput {
  db: DrizzleDb;
}

export interface TenantInput extends DbInput {
  tenant: ResolvedTenant;
}

export interface ResolveTenantByHostInput extends DbInput {
  host: string;
}

export interface GetPublicMenuInput extends TenantInput {
  nowMs: number;
}

export interface IdsInput extends DbInput {
  ids: string[];
}

export interface TenantIdsInput extends TenantInput {
  ids: string[];
}

export function appendMapValue<Key, Value>({
  key,
  map,
  value,
}: {
  key: Key;
  map: Map<Key, Value[]>;
  value: Value;
}): void {
  const values = map.get(key);

  if (values) {
    values.push(value);
    return;
  }

  map.set(key, [value]);
}
