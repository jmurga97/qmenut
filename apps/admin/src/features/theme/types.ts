import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { DEFAULT_TENANT_COLORS } from "@qmenut/ui/theme/tenant-theme-config";
import { z } from "zod";

const TEMPLATE_IDS = ["tapas", "fine", "cafe", "fast", "her"] as const;
export const THEME_OPTIONS = TEMPLATE_IDS.map((id) => ({ id, label: TEMPLATES[id].label }));
export const themeFormSchema = z.object({
  template: z.enum(["fine", "her", "fast", "cafe", "tapas"]),
  primary: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color no válido"),
  secondary: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color no válido"),
  tagline: z.string().trim().max(120, "Máximo 120 caracteres"),
});
export const defaultThemeFormValues = {
  template: "tapas",
  primary: DEFAULT_TENANT_COLORS.primary,
  secondary: DEFAULT_TENANT_COLORS.secondary,
  tagline: "",
} satisfies ThemeFormValues;
export type ThemeFormValues = z.infer<typeof themeFormSchema>;
