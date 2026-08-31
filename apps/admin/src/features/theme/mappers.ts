import { defaultThemeFormValues, themeFormSchema } from "./types";

import type { ThemeFormValues } from "./types";
import type { AppRouter } from "@qmenut/api/router";
import type { QmTenantThemeEditableConfig } from "@qmenut/ui/theme/tenant-theme-config";
import type { inferRouterOutputs } from "@trpc/server";

type ThemeConfig = inferRouterOutputs<AppRouter>["admin"]["theme"]["get"];
export function toThemeFormValues(theme: ThemeConfig): ThemeFormValues {
  const parsed = themeFormSchema.safeParse({ ...theme, tagline: theme?.tagline ?? "" });
  return parsed.success ? parsed.data : { ...defaultThemeFormValues };
}
type ThemeMapperInput = {
  branchId: string;
  current: ThemeConfig;
  values: ThemeFormValues;
};
export function toThemeInput({ branchId, current, values }: ThemeMapperInput) {
  return {
    branchId,
    config: toThemeDraft({ current, values }),
  };
}

export function toThemeDraft({ current, values }: Omit<ThemeMapperInput, "branchId">): QmTenantThemeEditableConfig {
  return {
    ...values,
    tagline: values.tagline || undefined,
    headingFont: current?.headingFont,
    bodyFont: current?.bodyFont,
  };
}
