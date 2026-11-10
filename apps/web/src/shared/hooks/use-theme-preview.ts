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
 * VITE_LANDING_ORIGIN is a comma-separated list: the production landing previews on the dev template tenants.
 */
function getParentOrigin(): string {
  const fallback = import.meta.env.DEV ? LOCAL_ORIGINS : PRODUCTION_ORIGINS;
  const admin = import.meta.env.VITE_ADMIN_ORIGIN || fallback.admin;
  const landings = (import.meta.env.VITE_LANDING_ORIGIN || fallback.landing).split(",");
  const referrer = document.referrer ? new URL(document.referrer).origin : admin;
  return landings.includes(referrer) ? referrer : admin;
}

export function useThemePreview(persistedTheme: QmTenantThemeConfig): QmTenantThemeConfig {
  const previewEnabled = useSearch({
    from: "/{-$locale}",
    select: (search) => search.themePreview === "admin",
  });
  const [previewTheme, setPreviewTheme] = useState(persistedTheme);

  useEffect(() => {
    if (!previewEnabled || window.parent === window) return;

    const allowedOrigin = getParentOrigin();

    function handleMessage(event: MessageEvent<unknown>) {
      if (event.origin !== allowedOrigin) return;
      if (!Object.is(event.source, window.parent)) return;

      const draft = parseThemePreviewUpdateMessage(event.data);
      if (!draft) return;

      setPreviewTheme(resolveTenantThemeConfig(draft));
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage(createThemePreviewReadyMessage(), allowedOrigin);

    return () => window.removeEventListener("message", handleMessage);
  }, [previewEnabled]);

  return previewEnabled ? previewTheme : persistedTheme;
}
