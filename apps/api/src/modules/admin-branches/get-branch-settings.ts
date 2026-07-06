import { listBranchPhotos, listBranchSchedules } from "@qmenut/db/repositories/admin-branches.repository";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db";
import type { BranchPhotoRow, BranchScheduleRow } from "@qmenut/db/repositories/admin-branches.repository";

export interface BranchSettings {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  socialLinksJson: string | null;
  customDomain: string | null;
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

  const [schedules, photos] = await Promise.all([
    listBranchSchedules({ db, branchId }),
    listBranchPhotos({ db, branchId }),
  ]);

  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    whatsapp: branch.whatsapp,
    socialLinksJson: branch.socialLinksJson,
    customDomain: branch.customDomain,
    schedules,
    photos,
  };
}
