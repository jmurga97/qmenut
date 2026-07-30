import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";

import { bumpPublicContentVersion as bumpThemePublicContentVersion } from "./theme/theme-worker-client";
import { resolveBranchHostOrNull } from "../modules/admin-tenant/resolve-branch-host";

import type { RuntimeEnv } from "../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

interface PublicContentVersionInput {
  env: RuntimeEnv;
  host: string;
}

async function bumpPublicContentVersion({ env, host }: PublicContentVersionInput): Promise<void> {
  try {
    await bumpThemePublicContentVersion(env, host);
  } catch (error) {
    console.error(`No se pudo actualizar la versión del contenido público para ${host}`, error);
  }
}

interface BumpPublicContentVersionForBranchInput {
  branchId: string;
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
}

/** Best-effort invalidation for public content belonging to one branch/domain. */
export async function bumpPublicContentVersionForBranch({
  branchId,
  db,
  env,
  restaurantId,
}: BumpPublicContentVersionForBranchInput): Promise<void> {
  try {
    const host = await resolveBranchHostOrNull({ db, restaurantId, branchId });

    if (host) {
      await bumpPublicContentVersion({ env, host });
    }
  } catch (error) {
    console.error(`No se pudo resolver el dominio del contenido público para la sucursal ${branchId}`, error);
  }
}

interface BumpPublicContentVersionForRestaurantInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  restaurantId: string;
}

/** Best-effort invalidation for restaurant-wide data such as languages and translations. */
export async function bumpPublicContentVersionForRestaurant({
  db,
  env,
  restaurantId,
}: BumpPublicContentVersionForRestaurantInput): Promise<void> {
  try {
    const branches = await listBranches({ db, restaurantId });
    const hosts = branches.flatMap((branch) => (branch.customDomain ? [branch.customDomain] : []));

    await Promise.all(hosts.map((host) => bumpPublicContentVersion({ env, host })));
  } catch (error) {
    console.error(
      `No se pudieron resolver los dominios del contenido público para el restaurante ${restaurantId}`,
      error,
    );
  }
}
