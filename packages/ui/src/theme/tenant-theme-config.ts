import { isBodyFontId, isHeadingFontId } from "./font-catalog";
import { TEMPLATES } from "./presets";

import type { QmFontId } from "./font-catalog";
import type { QmTemplateName, QmTemplatePreset } from "./presets";

/**
 * Per-tenant theme configuration stored in the `TENANT_THEME` KV namespace, keyed by the
 * tenant's normalized host. A stored value is a FULL preset object (every `QmTemplatePreset`
 * field) plus the tenant's own choices: template name, brand colors and optional tagline.
 * Tenants without a KV entry fall back to `TEMPLATES[DEFAULT_TEMPLATE]`.
 */
export interface QmTenantThemeConfig extends QmTemplatePreset {
  template: QmTemplateName;
  primary: string;
  secondary: string;
  tagline?: string;
  /** Optional font-catalog overrides. Resolved to `--qm-heading` / `--qm-body` by the engine;
   *  omitted (or role-invalid) falls back to the template preset's `heading` / `body`. */
  headingFont?: QmFontId;
  bodyFont?: QmFontId;
}

export const DEFAULT_TEMPLATE: QmTemplateName = "her";

export const DEFAULT_TENANT_COLORS = {
  primary: "#A23A28",
  secondary: "#3F7A4B",
} as const;

function isTemplateName(value: unknown): value is QmTemplateName {
  return typeof value === "string" && Object.hasOwn(TEMPLATES, value);
}

function isColor(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildDefaultTenantThemeConfig(template: QmTemplateName = DEFAULT_TEMPLATE): QmTenantThemeConfig {
  return {
    ...TEMPLATES[template],
    template,
    primary: DEFAULT_TENANT_COLORS.primary,
    secondary: DEFAULT_TENANT_COLORS.secondary,
  };
}

/**
 * Narrows a parsed KV JSON value into a usable theme config. Unknown/invalid input returns the
 * default config; a valid `template` with missing preset fields is overlaid on that template's
 * preset so partial entries stay renderable.
 */
export function resolveTenantThemeConfig(
  raw: unknown,
  fallbackTemplate: QmTemplateName = DEFAULT_TEMPLATE,
): QmTenantThemeConfig {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return buildDefaultTenantThemeConfig(fallbackTemplate);
  }

  const candidate = {
    ...(raw as Partial<QmTenantThemeConfig> & { layoutRecipe?: unknown }),
  };

  // Older KV entries stored the former recipe name. Layout now comes directly from the
  // selected template, so drop the legacy field instead of returning it to consumers.
  delete candidate.layoutRecipe;

  if (!isTemplateName(candidate.template)) {
    return buildDefaultTenantThemeConfig(fallbackTemplate);
  }

  const base = TEMPLATES[candidate.template];
  const layout =
    candidate.layout && typeof candidate.layout === "object" && !Array.isArray(candidate.layout)
      ? { ...base.layout, ...candidate.layout }
      : base.layout;

  let primary: string = DEFAULT_TENANT_COLORS.primary;

  if (isColor(candidate.primary)) {
    primary = candidate.primary;
  }

  let secondary: string = DEFAULT_TENANT_COLORS.secondary;

  if (isColor(candidate.secondary)) {
    secondary = candidate.secondary;
  }

  return {
    ...base,
    ...candidate,
    layout,
    template: candidate.template,
    primary,
    secondary,
    tagline: typeof candidate.tagline === "string" ? candidate.tagline : undefined,
    headingFont: isHeadingFontId(candidate.headingFont) ? candidate.headingFont : undefined,
    bodyFont: isBodyFontId(candidate.bodyFont) ? candidate.bodyFont : undefined,
  };
}
