import { getPublicBranch as findPublicBranch } from "@qmenut/db/repositories/public-menu.repository";

import type { DrizzleDb } from "@qmenut/db";
import type { ResolvedTenant } from "@qmenut/db/domain/tenant";
import type { PublicBranch } from "@qmenut/db/models/branch";

interface GetPublicBranchInput {
  db: DrizzleDb;
  tenant: ResolvedTenant;
}

export function getPublicBranch(input: GetPublicBranchInput): Promise<PublicBranch | null> {
  return findPublicBranch(input);
}
