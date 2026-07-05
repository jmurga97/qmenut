import { getPublicMenu as findPublicMenu } from "@qmenut/db/repositories/public-menu.repository";

import type { DrizzleDb } from "@qmenut/db";
import type { ResolvedTenant } from "@qmenut/db/domain/tenant";
import type { PublicMenuData } from "@qmenut/db/models/public-menu";

interface GetPublicMenuInput {
  db: DrizzleDb;
  nowMs?: number | undefined;
  tenant: ResolvedTenant;
}

export function getPublicMenu({ nowMs = Date.now(), ...input }: GetPublicMenuInput): Promise<PublicMenuData | null> {
  return findPublicMenu({ ...input, nowMs });
}
