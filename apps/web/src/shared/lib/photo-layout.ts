import { TEMPLATES } from "@qmenut/ui/theme/presets";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";
import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

export const HERO_PHOTO_LAYOUT = { cssWidth: 430, sizes: "(min-width: 431px) 430px, 100vw" };
export const FALLBACK_HERO_PHOTO_URL = "https://picsum.photos/seed/qmenut-branch/800/600";

/** Mirrors the photo groups and shell padding used by buildQmThemeVars. */
export function getPhotoLayout({ template, theme }: { template: QmTemplateName; theme: QmTenantThemeConfig }) {
  const preset = template === theme.template ? theme : TEMPLATES[template];
  const fullWidth = preset.photoMode === "hero" || preset.photoMode === "heroxl";
  const padding = Number((preset.layout["--qm-shell-pad-x"] ?? "18").replace("px", ""));
  const contentWidth = 430 - 2 * padding;
  const thumbWidth = { none: 52, thumb: 52, hero: 54, heroxl: 60 }[preset.photoMode];

  return {
    featured: fullWidth
      ? { cssWidth: contentWidth, sizes: `(min-width: 431px) ${contentWidth}px, calc(100vw - ${2 * padding}px)` }
      : { cssWidth: 94, sizes: "94px" },
    thumbnail: { cssWidth: thumbWidth, sizes: `${thumbWidth}px` },
  };
}
