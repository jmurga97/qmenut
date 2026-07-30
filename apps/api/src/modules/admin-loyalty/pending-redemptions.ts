import {
  expireStaleRedemptions,
  listPendingRedemptions as listPendingRedemptionsRow,
} from "@qmenut/db/repositories/loyalty-ledger.repository";

import { REDEMPTION_TTL_MS } from "../../lib/loyalty/token";

import type { DrizzleDb } from "@qmenut/db/client";
import type { PendingRedemptionRow } from "@qmenut/db/models/loyalty";

interface PendingRedemptionsInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function pendingRedemptions({
  db,
  restaurantId,
}: PendingRedemptionsInput): Promise<PendingRedemptionRow[]> {
  await expireStaleRedemptions({ db, restaurantId, olderThanMs: REDEMPTION_TTL_MS });

  return listPendingRedemptionsRow({ db, restaurantId });
}
