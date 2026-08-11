import { listBranchPhotos, listBranchSchedules } from "@qmenut/db/repositories/admin-branches.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";
import { TRPCError } from "@trpc/server";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db/client";
import type { BranchPhotoRow, BranchScheduleRow } from "@qmenut/db/repositories/admin-branches.repository";

export interface BranchSettings {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  socialLinksJson: string | null;
  customDomain: string | null;
  dataProtectionEmail: string | null;
  legalAddress: string | null;
  legalName: string | null;
  timezone: string;
  taxId: string | null;
  schedules: BranchScheduleRow[];
  photos: BranchPhotoRow[];
}

interface GetBranchSettingsInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

export async function getBranchSettings({
  db,
  restaurantId,
  branchId,
}: GetBranchSettingsInput): Promise<BranchSettings> {
  const branch = await assertBranchAccess({ db, restaurantId, branchId });

  const [schedules, photos, restaurant] = await Promise.all([
    listBranchSchedules({ db, branchId }),
    listBranchPhotos({ db, branchId }),
    getRestaurantById({ db, restaurantId }),
  ]);

  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurante no encontrado" });
  }

  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    latitude: branch.latitude,
    longitude: branch.longitude,
    phone: branch.phone,
    whatsapp: branch.whatsapp,
    socialLinksJson: branch.socialLinksJson,
    customDomain: branch.customDomain,
    dataProtectionEmail: restaurant.dataProtectionEmail,
    legalAddress: restaurant.legalAddress,
    legalName: restaurant.legalName,
    timezone: restaurant.timezone,
    taxId: restaurant.taxId,
    schedules,
    photos,
  };
}
