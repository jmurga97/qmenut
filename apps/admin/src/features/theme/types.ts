import { isBodyFontId, isHeadingFontId, QM_FONT_CATALOG, QM_FONT_IDS } from "@qmenut/ui/theme/font-catalog";
import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { DEFAULT_TEMPLATE, DEFAULT_TENANT_COLORS } from "@qmenut/ui/theme/tenant-theme-config";
import { z } from "zod";

import type { QmFontId } from "@qmenut/ui/theme/font-catalog";
import type { QmTemplateName } from "@qmenut/ui/theme/presets";

const TEMPLATE_IDS = ["tapas", "fine", "cafe", "fast", "her"] as const;
export const THEME_OPTIONS = TEMPLATE_IDS.map((id) => ({ id, label: TEMPLATES[id].label }));

export const THEME_TEMPLATE_FONT_ID = "template" as const;

function buildFontOptions(isAllowed: (fontId: QmFontId) => boolean) {
  return [
    { id: THEME_TEMPLATE_FONT_ID, label: "La de la plantilla" },
    ...QM_FONT_IDS.filter((fontId) => isAllowed(fontId)).map((id) => ({ id, label: QM_FONT_CATALOG[id].label })),
  ];
}

export const HEADING_FONT_OPTIONS = buildFontOptions(isHeadingFontId);
export const BODY_FONT_OPTIONS = buildFontOptions(isBodyFontId);

const headingFontSchema = z
  .union([z.literal(THEME_TEMPLATE_FONT_ID), z.enum(QM_FONT_IDS)])
  .refine((value) => value === THEME_TEMPLATE_FONT_ID || isHeadingFontId(value), "La fuente no es válida para títulos");

const bodyFontSchema = z
  .union([z.literal(THEME_TEMPLATE_FONT_ID), z.enum(QM_FONT_IDS)])
  .refine((value) => value === THEME_TEMPLATE_FONT_ID || isBodyFontId(value), "La fuente no es válida para el cuerpo");

export const themeFormSchema = z.object({
  template: z.enum(["fine", "her", "fast", "cafe", "tapas"]),
  primary: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color no válido"),
  secondary: z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color no válido"),
  tagline: z.string().trim().max(120, "Máximo 120 caracteres"),
  showMenuPhotos: z.boolean(),
  showDishPhoto: z.boolean(),
  headingFont: headingFontSchema,
  bodyFont: bodyFontSchema,
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
    headingFont: THEME_TEMPLATE_FONT_ID,
    bodyFont: THEME_TEMPLATE_FONT_ID,
  };
}
export type ThemeFormValues = z.infer<typeof themeFormSchema>;
