import { normalizeTenantHost } from "@qmenut/db/domain/tenant";
import { resolveTenantByHost } from "@qmenut/db/repositories/tenant.repository";

import type { DrizzleDb } from "@qmenut/db";
import type { ResolvedTenant } from "@qmenut/db/domain/tenant";

function getRequestHostname(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    return host.split(":")[0] ?? host;
  }

  return new URL(request.url).hostname;
}

interface ResolveTenantFromRequestInput {
  db: DrizzleDb;
  host?: string | undefined;
  request: Request;
}

export function resolveRequestTenantHost({ host, request }: Omit<ResolveTenantFromRequestInput, "db">): string {
  const inputHost = host ? normalizeTenantHost(host) : "";

  if (inputHost) {
    return inputHost;
  }

  return normalizeTenantHost(getRequestHostname(request));
}

export async function resolveTenantFromRequest({
  db,
  host,
  request,
}: ResolveTenantFromRequestInput): Promise<ResolvedTenant | null> {
  return resolveTenantByHost({ db, host: resolveRequestTenantHost({ host, request }) });
}
