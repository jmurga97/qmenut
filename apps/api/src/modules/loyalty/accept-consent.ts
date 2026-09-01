import {
  acceptLoyaltyConsent,
  findCustomerById,
  hasCurrentLoyaltyConsent,
} from "@qmenut/db/repositories/customers.repository";
import { TRPCError } from "@trpc/server";

import { LOYALTY_CONSENT_VERSION } from "./consent";
import { resolveCard } from "./resolve-card";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

interface AcceptConsentInput {
  db: DrizzleDb;
  email: string;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
}

export interface AcceptConsentResult {
  accepted: boolean;
}

/**
 * Stamps the current privacy consent for an existing card. The token proves the card and the email
 * proves the account, so a stolen token alone cannot consent on someone else's behalf.
 */
export async function acceptConsent({
  db,
  email,
  env,
  request,
  host,
  cardToken,
}: AcceptConsentInput): Promise<AcceptConsentResult> {
  const { tenant, customerId } = await resolveCard({ db, env, request, host, cardToken, requireConsent: false });

  const customer = await findCustomerById({ db, id: customerId });

  if (!customer || customer.email.toLowerCase() !== email.toLowerCase()) {
    throw new TRPCError({ code: "FORBIDDEN", message: "El email no corresponde a esta tarjeta" });
  }

  const consentCurrent = await hasCurrentLoyaltyConsent({
    consentVersion: LOYALTY_CONSENT_VERSION,
    db,
    customerId,
    restaurantId: tenant.restaurantId,
  });

  if (!consentCurrent) {
    const updated = await acceptLoyaltyConsent({
      acceptedAt: Date.now(),
      consentVersion: LOYALTY_CONSENT_VERSION,
      db,
      customerId,
      restaurantId: tenant.restaurantId,
    });

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tarjeta no encontrada" });
    }
  }

  return { accepted: true };
}
