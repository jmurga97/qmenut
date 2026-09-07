import {
  replaceBranchPhotosStatements,
  replaceBranchSchedulesStatements,
  updateBranchSettingsStatements,
} from "@qmenut/db/repositories/admin-branches.repository";
import { updateRestaurantSettingsStatement } from "@qmenut/db/repositories/restaurants.repository";

import type { DrizzleDb } from "@qmenut/db/client";
import type { BranchPhotoRow, BranchScheduleRow } from "@qmenut/db/repositories/admin-branches.repository";
import type { BatchItem } from "drizzle-orm/batch";

interface SaveBranchSettingsInput {
  statements?: BatchItem<"sqlite">[];
  preserveLogo?: boolean;
  preservePhotos?: boolean;
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  timezone: string;
  legal: {
    dataProtectionEmail: string | null;
    legalAddress: string | null;
    legalName: string | null;
    taxId: string | null;
  };
  info: {
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    whatsapp: string | null;
    socialLinksJson: string | null;
    logoUrl: string | null;
  };
  schedules: BranchScheduleRow[];
  photos: BranchPhotoRow[];
}

export async function saveBranchSettings({
  db,
  restaurantId,
  branchId,
  timezone,
  legal,
  info,
  schedules,
  photos,
  statements = [],
  preserveLogo,
  preservePhotos,
}: SaveBranchSettingsInput): Promise<void> {
  // The branch router authorizes this branch before validating image references and calling this writer.
  await db.batch([
    // Timezone is restaurant-wide even though it is edited from a branch settings page.
    updateRestaurantSettingsStatement({ db, legal, restaurantId, timezone }),
    ...updateBranchSettingsStatements({ db, restaurantId, branchId, data: info, preserveLogo }),
    ...replaceBranchSchedulesStatements({ db, branchId, schedules }),
    ...(preservePhotos ? [] : replaceBranchPhotosStatements({ db, branchId, photos })),
    ...statements,
  ]);
}
