import { getVenueCode as computeVenueCode } from "../../lib/loyalty/venue-code";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { RuntimeEnv } from "../../config/env/schema";
import type { VenueCode } from "../../lib/loyalty/venue-code";
import type { DrizzleDb } from "@qmenut/db/client";

interface GetVenueCodeInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
  branchId: string;
}

export async function getVenueCode({ db, env, restaurantId, branchId }: GetVenueCodeInput): Promise<VenueCode> {
  await assertBranchAccess({ db, restaurantId, branchId });

  return computeVenueCode({ secret: env.LOYALTY_TOKEN_SECRET, restaurantId, branchId });
}
