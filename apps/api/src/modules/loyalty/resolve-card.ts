import { hasCurrentLoyaltyConsent } from "@qmenut/db/repositories/customers.repository";
import { TRPCError } from "@trpc/server";

import { LOYALTY_CONSENT_VERSION } from "./consent";
import { verifyLoyaltyToken } from "../../lib/loyalty/token";
import { resolvePublicTenant } from "../public-menu/resolve-public-tenant";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { ResolvedTenant } from "@qmenut/db/domain/tenant";

interface ResolveCardInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
}

export interface ResolvedCard {
  customerId: string;
  tenant: ResolvedTenant;
}

/** Resolves the public tenant from the host and cross-checks the token's restaurant id against it. */
export async function resolveCard({ db, env, request, host, cardToken }: ResolveCardInput): Promise<ResolvedCard> {
  const tenant = await resolvePublicTenant({ db, request, host });

  if (!tenant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No hay ninguna sucursal asociada a este dominio" });
  }

  const payload = await verifyLoyaltyToken({ secret: env.LOYALTY_TOKEN_SECRET, token: cardToken });

  if (!payload || payload.t !== "card" || payload.rid !== tenant.restaurantId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const hasConsent = await hasCurrentLoyaltyConsent({
    consentVersion: LOYALTY_CONSENT_VERSION,
    db,
    customerId: payload.cid,
    restaurantId: tenant.restaurantId,
  });

  if (!hasConsent) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Se requiere aceptar la política de privacidad" });
  }

  return { tenant, customerId: payload.cid };
}
