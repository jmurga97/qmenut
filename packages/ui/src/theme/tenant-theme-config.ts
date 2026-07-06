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
  return typeof value === "string" && value in TEMPLATES;
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
export function resolveTenantThemeConfig(raw: unknown): QmTenantThemeConfig {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return buildDefaultTenantThemeConfig();
  }

  const candidate = raw as Partial<QmTenantThemeConfig>;

  if (!isTemplateName(candidate.template)) {
    return buildDefaultTenantThemeConfig();
  }

  const base = TEMPLATES[candidate.template];

  return {
    ...base,
    ...candidate,
    template: candidate.template,
    primary: isColor(candidate.primary) ? candidate.primary : DEFAULT_TENANT_COLORS.primary,
    secondary: isColor(candidate.secondary) ? candidate.secondary : DEFAULT_TENANT_COLORS.secondary,
    tagline: typeof candidate.tagline === "string" ? candidate.tagline : undefined,
    headingFont: isHeadingFontId(candidate.headingFont) ? candidate.headingFont : undefined,
    bodyFont: isBodyFontId(candidate.bodyFont) ? candidate.bodyFont : undefined,
  };
}
