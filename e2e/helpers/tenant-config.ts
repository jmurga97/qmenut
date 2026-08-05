import { expect } from "@playwright/test";

import type { APIRequestContext } from "@playwright/test";

const TENANT_CONFIG_URL = "http://localhost:8788";

async function getTenantValue<T>(
  request: APIRequestContext,
  host: string,
  resource: "menu-version" | "theme",
): Promise<T> {
  const response = await request.get(`${TENANT_CONFIG_URL}/tenants/${host}/${resource}`, {
    timeout: 5_000,
  });
  const body = (await response.json()) as T;

  expect(response.ok(), JSON.stringify(body)).toBe(true);
  return body;
}

export async function getTenantTheme(request: APIRequestContext, host: string): Promise<Record<string, unknown>> {
  return getTenantValue<Record<string, unknown>>(request, host, "theme");
}

export async function getContentVersion(request: APIRequestContext, host: string): Promise<string | null> {
  const body = await getTenantValue<{ version?: string | null }>(request, host, "menu-version");
  return body.version ?? null;
}
