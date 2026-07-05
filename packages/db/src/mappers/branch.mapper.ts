import type { PublicBranch, PublicBranchPhoto, PublicBranchSchedule } from "../models/branch";
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
