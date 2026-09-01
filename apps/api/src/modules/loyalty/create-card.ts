import { upsertCustomerCard } from "@qmenut/db/repositories/customers.repository";
import { getLoyaltyProgram } from "@qmenut/db/repositories/loyalty-admin.repository";
import { TRPCError } from "@trpc/server";

import { LOYALTY_CONSENT_VERSION } from "./consent";
import { signLoyaltyToken } from "../../lib/loyalty/token";
import { resolvePublicTenant } from "../public-menu/resolve-public-tenant";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { CustomerCardState } from "@qmenut/db/models/loyalty";

interface CreateCardInput {
  consentAccepted: boolean;
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  email: string;
}

export interface CreateCardResult {
  card: CustomerCardState;
  cardToken: string;
  email: string;
}

/** Idempotent by email — this is also the card-recovery path (re-entering the same email anywhere). */
export async function createCard({
  consentAccepted,
  db,
  env,
  request,
  host,
  email,
}: CreateCardInput): Promise<CreateCardResult> {
  if (!consentAccepted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Es necesario aceptar la política de privacidad" });
  }

  const tenant = await resolvePublicTenant({ db, request, host });

  if (!tenant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No hay ninguna sucursal asociada a este dominio" });
  }

  const program = await getLoyaltyProgram({ db, restaurantId: tenant.restaurantId });

  if (!program?.isActive) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El programa de fidelización no está activo" });
  }

  const card = await upsertCustomerCard({
    consentVersion: LOYALTY_CONSENT_VERSION,
    db,
    email,
    restaurantId: tenant.restaurantId,
  });
  const cardToken = await signLoyaltyToken({
    secret: env.LOYALTY_TOKEN_SECRET,
    payload: { v: 1, t: "card", cid: card.customerId, rid: tenant.restaurantId },
  });

  return { cardToken, card, email };
}
