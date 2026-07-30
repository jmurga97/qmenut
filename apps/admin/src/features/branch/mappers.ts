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
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
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
  return {
    branchId,
    timezone: values.timezone,
    info: {
      name: values.name,
      address: values.address,
      phone: values.phone,
      whatsapp: values.whatsapp,
      socialLinksJson: settings.socialLinksJson ?? undefined,
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
