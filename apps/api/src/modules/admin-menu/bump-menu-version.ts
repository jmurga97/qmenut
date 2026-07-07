import { ThemeWorkerClient } from "../../lib/theme/theme-worker-client";
import { resolveBranchHostOrNull } from "../admin-tenant/resolve-branch-host";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db";

interface BumpMenuVersionForBranchInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
  branchId: string;
}

/**
 * Invalidates the ISR edge cache for a tenant's public menu after a dish/category edit.
 * Best-effort: a failed bump only delays freshness (self-heals on the next successful
 * mutation), so it must never fail the menu edit itself.
 */
export async function bumpMenuVersionForBranch({
  db,
  env,
  restaurantId,
  branchId,
}: BumpMenuVersionForBranchInput): Promise<void> {
  try {
    const host = await resolveBranchHostOrNull({ db, restaurantId, branchId });

    if (!host) {
      return;
    }

    await ThemeWorkerClient.getInstance().bumpMenuVersion(env, host);
  } catch (error) {
    console.error("Failed to bump menu version", error);
  }
}
