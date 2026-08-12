import { hhmmToMinutes, minutesToHHMM } from "./services";
import { DAYS } from "./types";

import type { BranchFormValues } from "./types";
import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type BranchSettings = inferRouterOutputs<AppRouter>["admin"]["branches"]["get"];
export function toBranchFormValues(settings: BranchSettings): BranchFormValues {
  return {
    name: settings.name,
    address: settings.address ?? "",
    latitude: settings.latitude === null ? "" : String(settings.latitude),
    longitude: settings.longitude === null ? "" : String(settings.longitude),
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
    logoUrl: settings.logoUrl ?? "",
    legalName: settings.legalName ?? "",
    taxId: settings.taxId ?? "",
    legalAddress: settings.legalAddress ?? "",
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
};
export function toBranchInput({ branchId, settings, values }: BranchMapperInput) {
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
      logoUrl: values.logoUrl,
      socialLinksJson: settings.socialLinksJson ?? undefined,
    },
    legal: {
      legalName: values.legalName,
      taxId: values.taxId,
      legalAddress: values.legalAddress,
      dataProtectionEmail: values.dataProtectionEmail,
    },
    schedules: values.schedules
      .filter((row) => row.enabled)
      .map((row) => ({
        dayOfWeek: row.dayOfWeek,
        openMinute: hhmmToMinutes(row.open),
        closeMinute: hhmmToMinutes(row.close),
      })),
    photos: settings.photos,
  };
}
