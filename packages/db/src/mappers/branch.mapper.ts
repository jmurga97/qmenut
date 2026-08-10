import type { PublicBranch, PublicBranchPhoto, PublicBranchSchedule, PublicContactBranch } from "../models/branch";
import type { branches } from "../schema/branches";

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

export function mapBranch({
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
    restaurantId: row.restaurantId,
    name: row.name,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    socialLinks: parseSocialLinks(row.socialLinksJson),
    customDomain: row.customDomain,
    currency: row.currency,
    latitude: row.latitude,
    longitude: row.longitude,
    photos,
    schedules,
  };
}

export function mapContactBranch({
  row,
  schedules,
}: {
  row: typeof branches.$inferSelect;
  schedules: PublicBranchSchedule[];
}): PublicContactBranch {
  return {
    address: row.address,
    customDomain: row.customDomain,
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    name: row.name,
    phone: row.phone,
    schedules,
    socialLinks: parseSocialLinks(row.socialLinksJson),
    whatsapp: row.whatsapp,
  };
}
