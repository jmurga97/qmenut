import {
  createThemePreviewReadyMessage,
  parseThemePreviewUpdateMessage,
  resolveTenantThemeConfig,
} from "@qmenut/ui/theme/tenant-theme-config";
import { useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

const LOCAL_ORIGINS = { admin: "http://localhost:5174", landing: "http://localhost:4321" };
const PRODUCTION_ORIGINS = { admin: "https://admin.qmenut.app", landing: "https://qmenut.app" };

/**
 * The admin theme editor or a landing sign-up form; the iframe's referrer says which one is the parent.
 * Both origin lists allow the production signup and onboarding flows to preview on dev template tenants.
 */
function getParentOrigin(): string {
  const fallback = import.meta.env.DEV ? LOCAL_ORIGINS : PRODUCTION_ORIGINS;
  const admins = (import.meta.env.VITE_ADMIN_ORIGIN || fallback.admin).split(",");
  const landings = (import.meta.env.VITE_LANDING_ORIGIN || fallback.landing).split(",");
  const referrer = document.referrer ? new URL(document.referrer).origin : admins[0];
  return [...admins, ...landings].includes(referrer) ? referrer : admins[0];
}

export function useThemePreview(persistedTheme: QmTenantThemeConfig): {
  theme: QmTenantThemeConfig;
  restaurantName?: string;
} {
  const previewEnabled = useSearch({
    from: "/{-$locale}",
    select: (search) => search.themePreview === "admin",
  });
  const [previewTheme, setPreviewTheme] = useState(persistedTheme);
  const [restaurantName, setRestaurantName] = useState<string>();

  useEffect(() => {
    if (!previewEnabled || window.parent === window) return;

    const allowedOrigin = getParentOrigin();

    function handleMessage(event: MessageEvent<unknown>) {
      if (event.origin !== allowedOrigin) return;
      if (!Object.is(event.source, window.parent)) return;

      const draft = parseThemePreviewUpdateMessage(event.data);
      if (!draft) return;

      const { restaurantName: name, ...theme } = draft;
      setPreviewTheme(resolveTenantThemeConfig(theme));
      setRestaurantName(name);
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage(createThemePreviewReadyMessage(), allowedOrigin);

    return () => window.removeEventListener("message", handleMessage);
  }, [previewEnabled]);

  return previewEnabled ? { theme: previewTheme, restaurantName } : { theme: persistedTheme };
}
