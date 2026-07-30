import { getLoyaltyProgram as findProgram, listRewards } from "@qmenut/db/repositories/loyalty-admin.repository";

import { resolvePublicTenant } from "../public-menu/resolve-public-tenant";

import type { DrizzleDb } from "@qmenut/db/client";
import type { LoyaltyRewardView } from "@qmenut/db/models/loyalty";

interface GetLoyaltyProgramForClientInput {
  db: DrizzleDb;
  request: Request;
  host?: string;
}

export interface PublicLoyaltyProgram {
  program: { stampsPerVisit: number };
  rewards: LoyaltyRewardView[];
}

export async function getLoyaltyProgramForClient({
  db,
  request,
  host,
}: GetLoyaltyProgramForClientInput): Promise<PublicLoyaltyProgram | null> {
  const tenant = await resolvePublicTenant({ db, request, host });

  if (!tenant) {
    return null;
  }

  const program = await findProgram({ db, restaurantId: tenant.restaurantId });

  if (!program?.isActive) {
    return null;
  }

  const rewards = await listRewards({ db, restaurantId: tenant.restaurantId, includeInactive: false });

  return { program: { stampsPerVisit: program.stampsPerVisit }, rewards };
}
