import { socialIcon } from "@qmenut/ui/components/qm-social-links";

import { hhmmToMinutes, minutesToHHMM } from "./services";
import { DAYS } from "./types";

import type { BranchFormValues } from "./types";
import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";
import type { PreparedImage } from "~/shared/images/image-draft";

type BranchSettings = inferRouterOutputs<AppRouter>["admin"]["branches"]["get"];
function parseSocialLinksRows(socialLinksJson: string | null): { url: string }[] {
  if (!socialLinksJson) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(socialLinksJson);
  } catch {
    return [];
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return [];

  return Object.values(parsed)
    .filter((url): url is string => typeof url === "string" && url.length > 0)
    .map((url) => ({ url }));
}
function socialLabel(url: string, used: Set<string>): string {
  const icon = socialIcon({ href: url, label: "" });
  const base = icon === "generic" ? new URL(url).hostname.replace(/^www\./, "") : icon;
  let label = base;
  let suffix = 2;
  while (used.has(label)) {
    label = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(label);
  return label;
}
function serializeSocialLinks(rows: { url: string }[]): string | undefined {
  const used = new Set<string>();
  const links: Record<string, string> = {};
  for (const { url } of rows) {
    if (!url.trim()) continue;
    links[socialLabel(url.trim(), used)] = url.trim();
  }
  return Object.keys(links).length > 0 ? JSON.stringify(links) : undefined;
}
export function toBranchFormValues(settings: BranchSettings): BranchFormValues {
  return {
    name: settings.name,
    address: settings.address ?? "",
    latitude: settings.latitude === null ? "" : String(settings.latitude),
    longitude: settings.longitude === null ? "" : String(settings.longitude),
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
    socials: parseSocialLinksRows(settings.socialLinksJson),
    logoUrl: settings.logoUrl ?? "",
    legalName: settings.legalName ?? "",
    taxId: settings.taxId ?? "",
    dataProtectionEmail: settings.dataProtectionEmail ?? "",
    timezone: settings.timezone,
    schedules: DAYS.map((_, index) => {
      const dayOfWeek = index + 1;
      const current = settings.schedules.find((row) => row.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        enabled: Boolean(current),
        open: current ? minutesToHHMM(current.openMinute) : "12:00",
        close: current ? minutesToHHMM(current.closeMinute) : "23:00",
      };
    }),
  };
}
type BranchMapperInput = {
  branchId: string;
  settings: BranchSettings;
  values: BranchFormValues;
  logo: PreparedImage;
  photos: PreparedImage[];
};
export function toBranchInput({ branchId, settings, values, logo, photos }: BranchMapperInput) {
  const latitude = values.latitude.trim() ? Number(values.latitude) : null;
  const longitude = values.longitude.trim() ? Number(values.longitude) : null;

  return {
    branchId,
    timezone: values.timezone,
    info: {
      name: values.name,
      address: values.address,
      latitude,
      longitude,
      phone: values.phone,
      whatsapp: values.whatsapp,
      logoUrl: logo.imageUrl ?? undefined,
      logoUploadId: logo.uploadId,
      socialLinksJson: serializeSocialLinks(values.socials),
    },
    legal: {
      legalName: values.legalName,
      taxId: values.taxId,
      legalAddress: values.address.trim() ? values.address : (settings.legalAddress ?? undefined),
      dataProtectionEmail: values.dataProtectionEmail,
    },
    schedules: values.schedules
      .filter((row) => row.enabled)
      .map((row) => ({
        dayOfWeek: row.dayOfWeek,
        openMinute: hhmmToMinutes(row.open),
        closeMinute: hhmmToMinutes(row.close),
      })),
    photos: photos.flatMap((photo, position) =>
      photo.imageUrl ? [{ url: photo.imageUrl, uploadId: photo.uploadId, position }] : [],
    ),
  };
}
