import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { DEFAULT_TEMPLATE, DEFAULT_TENANT_COLORS } from "@qmenut/ui/theme/tenant-theme-config";
import { z } from "zod";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";

const TEMPLATE_IDS = ["tapas", "fine", "cafe", "fast", "her"] as const;
export const THEME_OPTIONS = TEMPLATE_IDS.map((id) => ({ id, label: TEMPLATES[id].label }));
export const themeFormSchema = z.object({
  template: z.enum(["fine", "her", "fast", "cafe", "tapas"]),
  primary: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color no válido"),
  secondary: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color no válido"),
  tagline: z.string().trim().max(120, "Máximo 120 caracteres"),
  showMenuPhotos: z.boolean(),
  showDishPhoto: z.boolean(),
});
/** Defaults derived from a template's preset so the photo flags match what the public menu shows. */
export function defaultThemeFormValues(template: QmTemplateName = DEFAULT_TEMPLATE): ThemeFormValues {
  const showPresetPhotos = TEMPLATES[template].photoMode !== "none";
  return {
    template,
    primary: DEFAULT_TENANT_COLORS.primary,
    secondary: DEFAULT_TENANT_COLORS.secondary,
    tagline: "",
    showMenuPhotos: showPresetPhotos,
    showDishPhoto: showPresetPhotos,
  };
}
export type ThemeFormValues = z.infer<typeof themeFormSchema>;
