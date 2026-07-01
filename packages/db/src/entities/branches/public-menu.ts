import { and, asc, eq, isNull } from "drizzle-orm";

import { branchPhotos, branches, branchSchedules } from "./schema";

import type { ResolveTenantByHostInput, ResolvedTenant, TenantInput } from "../../repositories/public-menu/shared";

export interface PublicBranchPhoto {
  id: string;
  position: number;
  url: string;
}

export interface PublicBranchSchedule {
  closeMinute: number;
  dayOfWeek: number;
  id: string;
  openMinute: number;
}

export interface PublicBranch {
  address: string | null;
  currency: string;
  customDomain: string | null;
  id: string;
  name: string;
  phone: string | null;
  photos: PublicBranchPhoto[];
  schedules: PublicBranchSchedule[];
  socialLinks: unknown;
  whatsapp: string | null;
}

function parseSocialLinks(socialLinksJson: string | null): unknown {
  if (!socialLinksJson) {
    return null;
  }

  try {
    return JSON.parse(socialLinksJson) as unknown;
  } catch {
    return null;
  }
}

function mapBranch({
  photos,
  row,
  schedules,
}: {
  photos: PublicBranchPhoto[];
  row: typeof branches.$inferSelect;
  schedules: PublicBranchSchedule[];
}): PublicBranch {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    socialLinks: parseSocialLinks(row.socialLinksJson),
    customDomain: row.customDomain,
    currency: row.currency,
    photos,
    schedules,
  };
}

async function getBranchRow({ db, tenant }: TenantInput) {
  return db
    .select()
    .from(branches)
    .where(
      and(
        eq(branches.id, tenant.branchId),
        eq(branches.restaurantId, tenant.restaurantId),
        isNull(branches.deletedAt),
        eq(branches.isActive, true),
      ),
    )
    .get();
}

async function getBranchPhotos({ db, tenant }: TenantInput): Promise<PublicBranchPhoto[]> {
  return db
    .select({
      id: branchPhotos.id,
      url: branchPhotos.url,
      position: branchPhotos.position,
    })
    .from(branchPhotos)
    .where(eq(branchPhotos.branchId, tenant.branchId))
    .orderBy(asc(branchPhotos.position), asc(branchPhotos.id))
    .all();
}

async function getBranchSchedules({ db, tenant }: TenantInput): Promise<PublicBranchSchedule[]> {
  return db
    .select({
      id: branchSchedules.id,
      dayOfWeek: branchSchedules.dayOfWeek,
      openMinute: branchSchedules.openMinute,
      closeMinute: branchSchedules.closeMinute,
    })
    .from(branchSchedules)
    .where(eq(branchSchedules.branchId, tenant.branchId))
    .orderBy(asc(branchSchedules.dayOfWeek), asc(branchSchedules.openMinute))
    .all();
}

export function normalizeTenantHost(host: string): string {
  const trimmed = host.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);

    return url.hostname;
  } catch {
    return trimmed.split("/")[0]?.split(":")[0] ?? trimmed;
  }
}

export async function resolveTenantByHost({ db, host }: ResolveTenantByHostInput): Promise<ResolvedTenant | null> {
  const normalizedHost = normalizeTenantHost(host);

  if (!normalizedHost) {
    return null;
  }

  const row = await db
    .select({
      branchId: branches.id,
      restaurantId: branches.restaurantId,
    })
    .from(branches)
    .where(and(eq(branches.customDomain, normalizedHost), isNull(branches.deletedAt), eq(branches.isActive, true)))
    .get();

  return row ?? null;
}

export async function getPublicBranch({ db, tenant }: TenantInput): Promise<PublicBranch | null> {
  const row = await getBranchRow({ db, tenant });

  if (!row) {
    return null;
  }

  const [photos, schedules] = await Promise.all([getBranchPhotos({ db, tenant }), getBranchSchedules({ db, tenant })]);

  return mapBranch({ row, photos, schedules });
}
