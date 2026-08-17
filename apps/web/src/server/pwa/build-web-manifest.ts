import { SHORT_NAME_MAX_LENGTH, truncateLabel } from "~/lib/app-label";

import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import type { PublicMenuData } from "~/features/menu/api/public-menu-types";

interface ManifestIcon {
  purpose?: string;
  sizes?: string;
  src: string;
  type?: string;
}

export interface WebManifest {
  background_color: string;
  description: string;
  display: string;
  icons: ManifestIcon[];
  id: string;
  lang: string;
  name: string;
  scope: string;
  short_name: string;
  start_url: string;
  theme_color: string;
}

function buildIcons(logoUrl: string | null): ManifestIcon[] {
  return [
    ...(logoUrl ? [{ src: logoUrl }] : []),
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
}

function buildDescription(data: PublicMenuData, theme: QmTenantThemeConfig): string {
  if (theme.tagline) {
    return theme.tagline;
  }

  const { address, name } = data.branch;

  return address ? `${name} · ${address}` : name;
}

export interface BuildWebManifestInput {
  data: PublicMenuData;
  theme: QmTenantThemeConfig;
}

export function buildWebManifest({ data, theme }: BuildWebManifestInput): WebManifest {
  return {
    id: "/",
    name: data.branch.name,
    short_name: truncateLabel(data.branch.name, SHORT_NAME_MAX_LENGTH),
    description: buildDescription(data, theme),
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: theme.paper,
    theme_color: theme.primary,
    lang: data.language.default,
    icons: buildIcons(data.branch.logoUrl),
  };
}
