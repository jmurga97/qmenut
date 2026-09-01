import {
  createThemePreviewReadyMessage,
  parseThemePreviewUpdateMessage,
  resolveTenantThemeConfig,
} from "@qmenut/ui/theme/tenant-theme-config";
import { useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

const LOCAL_ADMIN_ORIGIN = "http://localhost:5174";
const PRODUCTION_ADMIN_ORIGIN = "https://admin.qmenut.app";

function getAllowedAdminOrigin(): string {
  return import.meta.env.VITE_ADMIN_ORIGIN || (import.meta.env.DEV ? LOCAL_ADMIN_ORIGIN : PRODUCTION_ADMIN_ORIGIN);
}

export function useThemePreview(persistedTheme: QmTenantThemeConfig): QmTenantThemeConfig {
  const previewEnabled = useSearch({
    from: "/{-$locale}",
    select: (search) => search.themePreview === "admin",
  });
  const [previewTheme, setPreviewTheme] = useState(persistedTheme);

  useEffect(() => {
    if (!previewEnabled || window.parent === window) return;

    const allowedOrigin = getAllowedAdminOrigin();

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
