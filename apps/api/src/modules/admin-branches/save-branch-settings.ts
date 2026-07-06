import {
  replaceBranchPhotos,
  replaceBranchSchedules,
  updateBranchSettings,
} from "@qmenut/db/repositories/admin-branches.repository";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db";
import type { BranchPhotoRow, BranchScheduleRow } from "@qmenut/db/repositories/admin-branches.repository";

interface SaveBranchSettingsInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  info: {
    name: string;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    socialLinksJson: string | null;
  };
  schedules: BranchScheduleRow[];
  photos: BranchPhotoRow[];
}

export async function saveBranchSettings({
  db,
  restaurantId,
  branchId,
  info,
  schedules,
  photos,
}: SaveBranchSettingsInput): Promise<void> {
  await assertBranchAccess({ db, restaurantId, branchId });

  await updateBranchSettings({ db, restaurantId, branchId, data: info });
  await replaceBranchSchedules({ db, branchId, schedules });
  await replaceBranchPhotos({ db, branchId, photos });
}
