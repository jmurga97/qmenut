import { countFounders } from "@qmenut/db/repositories/trials.repository";

import type { DrizzleDb } from "@qmenut/db/client";

export const FOUNDER_SLOTS = 100;

/** Founder places still open across both markets. */
export async function founderSlotsLeft(db: DrizzleDb): Promise<number> {
  return Math.max(0, FOUNDER_SLOTS - (await countFounders(db)));
}
