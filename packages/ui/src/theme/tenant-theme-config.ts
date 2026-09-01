import { isBodyFontId, isHeadingFontId } from "./font-catalog";
import { TEMPLATES } from "./presets";

import type { QmFontId } from "./font-catalog";
import type { QmTemplateName, QmTemplatePreset } from "./presets";

export interface QmTenantThemeEditableConfig {
  template: QmTemplateName;
  primary: string;
  secondary: string;
  tagline?: string;
  showMenuPhotos: boolean;
  showDishPhoto: boolean;
  /** Optional font-catalog overrides retained even though they are not exposed by the editor. */
  headingFont?: QmFontId;
  bodyFont?: QmFontId;
}

/**
 * Per-tenant theme configuration stored in the `TENANT_THEME` KV namespace, keyed by the
 * tenant's normalized host. A stored value is a FULL preset object (every `QmTemplatePreset`
 * field) plus the tenant's own choices: template name, brand colors and optional tagline.
 * Tenants without a KV entry fall back to `TEMPLATES[DEFAULT_TEMPLATE]`.
 */
export interface QmTenantThemeConfig extends QmTemplatePreset, QmTenantThemeEditableConfig {}

export const QM_THEME_PREVIEW_READY = "qmenut.theme-preview.ready" as const;
export const QM_THEME_PREVIEW_UPDATE = "qmenut.theme-preview.update" as const;
export const QM_THEME_PREVIEW_VERSION = 1 as const;
export const QM_THEME_PREVIEW_SEARCH_PARAM = "themePreview" as const;
export const QM_THEME_PREVIEW_SEARCH_VALUE = "admin" as const;

export interface QmThemePreviewReadyMessage {
  type: typeof QM_THEME_PREVIEW_READY;
  version: typeof QM_THEME_PREVIEW_VERSION;
}

export interface QmThemePreviewUpdateMessage {
  type: typeof QM_THEME_PREVIEW_UPDATE;
  version: typeof QM_THEME_PREVIEW_VERSION;
  payload: QmTenantThemeEditableConfig;
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
  const preset = TEMPLATES[template];
  const showPresetPhotos = preset.photoMode !== "none";

  return {
    ...preset,
    template,
    primary: DEFAULT_TENANT_COLORS.primary,
    secondary: DEFAULT_TENANT_COLORS.secondary,
    showMenuPhotos: showPresetPhotos,
    showDishPhoto: showPresetPhotos,
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
  const showPresetPhotos = (candidate.photoMode ?? base.photoMode) !== "none";
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
    showMenuPhotos: typeof candidate.showMenuPhotos === "boolean" ? candidate.showMenuPhotos : showPresetPhotos,
    showDishPhoto: typeof candidate.showDishPhoto === "boolean" ? candidate.showDishPhoto : showPresetPhotos,
    headingFont: isHeadingFontId(candidate.headingFont) ? candidate.headingFont : undefined,
    bodyFont: isBodyFontId(candidate.bodyFont) ? candidate.bodyFont : undefined,
  };
}

export function createThemePreviewReadyMessage(): QmThemePreviewReadyMessage {
  return { type: QM_THEME_PREVIEW_READY, version: QM_THEME_PREVIEW_VERSION };
}

export function createThemePreviewUpdateMessage(payload: QmTenantThemeEditableConfig): QmThemePreviewUpdateMessage {
  return { type: QM_THEME_PREVIEW_UPDATE, version: QM_THEME_PREVIEW_VERSION, payload };
}

export function isThemePreviewReadyMessage(value: unknown): value is QmThemePreviewReadyMessage {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Partial<QmThemePreviewReadyMessage>;
  return candidate.type === QM_THEME_PREVIEW_READY && candidate.version === QM_THEME_PREVIEW_VERSION;
}

export function parseThemePreviewUpdateMessage(value: unknown): QmTenantThemeEditableConfig | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = value as { payload?: unknown; type?: unknown; version?: unknown };
  if (candidate.type !== QM_THEME_PREVIEW_UPDATE || candidate.version !== QM_THEME_PREVIEW_VERSION) return null;

  const payload = candidate.payload;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const config = payload as Partial<QmTenantThemeEditableConfig>;
  if (!isTemplateName(config.template)) return null;
  if (typeof config.primary !== "string" || !/^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/.test(config.primary)) {
    return null;
  }
  if (typeof config.secondary !== "string" || !/^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/.test(config.secondary)) {
    return null;
  }
  if (config.tagline !== undefined && (typeof config.tagline !== "string" || config.tagline.length > 120)) {
    return null;
  }
  if (typeof config.showMenuPhotos !== "boolean" || typeof config.showDishPhoto !== "boolean") return null;
  if (config.headingFont !== undefined && !isHeadingFontId(config.headingFont)) return null;
  if (config.bodyFont !== undefined && !isBodyFontId(config.bodyFont)) return null;

  return {
    template: config.template,
    primary: config.primary,
    secondary: config.secondary,
    tagline: config.tagline,
    showMenuPhotos: config.showMenuPhotos,
    showDishPhoto: config.showDishPhoto,
    headingFont: config.headingFont,
    bodyFont: config.bodyFont,
  };
}
