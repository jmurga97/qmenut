import { DEFAULT_TEMPLATE } from "@qmenut/ui/theme/tenant-theme-config";

import { defaultThemeFormValues, THEME_TEMPLATE_FONT_ID, themeFormSchema } from "./types";

import type { ThemeFormValues } from "./types";
import type { AppRouter } from "@qmenut/api/router";
import type { QmTenantThemeEditableConfig } from "@qmenut/ui/theme/tenant-theme-config";
import type { inferRouterOutputs } from "@trpc/server";

type ThemeConfig = inferRouterOutputs<AppRouter>["admin"]["theme"]["get"];
export function toThemeFormValues(theme: ThemeConfig): ThemeFormValues {
  const parsed = themeFormSchema.safeParse({
    ...theme,
    tagline: theme?.tagline ?? "",
    headingFont: theme?.headingFont ?? THEME_TEMPLATE_FONT_ID,
    bodyFont: theme?.bodyFont ?? THEME_TEMPLATE_FONT_ID,
  });
  if (parsed.success) return parsed.data;
  // Fall back to the tenant's own template so the photo flags match its preset (a photo-less
  // template must not default to both photo checkboxes checked).
  return defaultThemeFormValues(theme?.template ?? DEFAULT_TEMPLATE);
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

export function toThemeDraft({ values }: Omit<ThemeMapperInput, "branchId">): QmTenantThemeEditableConfig {
  const { bodyFont, headingFont, ...editableValues } = values;

  return {
    ...editableValues,
    tagline: editableValues.tagline || undefined,
    headingFont: headingFont === THEME_TEMPLATE_FONT_ID ? undefined : headingFont,
    bodyFont: bodyFont === THEME_TEMPLATE_FONT_ID ? undefined : bodyFont,
  };
}
