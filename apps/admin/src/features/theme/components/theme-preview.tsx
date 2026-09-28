import { Badge } from "@jmurga97/components";
import {
  createThemePreviewUpdateMessage,
  isThemePreviewReadyMessage,
  QM_THEME_PREVIEW_SEARCH_PARAM,
  QM_THEME_PREVIEW_SEARCH_VALUE,
} from "@qmenut/ui/theme/tenant-theme-config";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { i18n } from "~/lib/i18n";
import { buildPublicMenuUrl } from "~/shared/services/public-menu-url";

import type { QmTenantThemeEditableConfig } from "@qmenut/ui/theme/tenant-theme-config";

interface ThemePreviewProps {
  draft: QmTenantThemeEditableConfig | null;
  host: string;
}

type PreviewStatus = "error" | "loading" | "ready";

const PREVIEW_STATUS_LABELS: Record<PreviewStatus, string> = {
  error: i18n.t("theme___No disponible"),
  loading: i18n.t("theme___Cargando"),
  ready: i18n.t("theme___En directo"),
};
const PREVIEW_STATUS_TONES = { error: "error", loading: "info", ready: "success" } as const;

export function ThemePreview({ draft, host }: ThemePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const preview = useMemo(() => {
    const url = new URL(buildPublicMenuUrl(host));
    url.searchParams.set(QM_THEME_PREVIEW_SEARCH_PARAM, QM_THEME_PREVIEW_SEARCH_VALUE);
    return { origin: url.origin, url: url.href };
  }, [host]);

  const postDraft = useEffectEvent(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow || !draft) return;

    frameWindow.postMessage(createThemePreviewUpdateMessage(draft), preview.origin);
  });

  useEffect(() => {
    function handleMessage(event: MessageEvent<unknown>) {
      if (event.origin !== preview.origin) return;
      if (!Object.is(event.source, iframeRef.current?.contentWindow)) return;
      if (!isThemePreviewReadyMessage(event.data)) return;

      readyRef.current = true;
      setStatus("ready");
      postDraft();
    }

    const timeout = window.setTimeout(() => {
      if (!readyRef.current) setStatus("error");
    }, 12_000);

    window.addEventListener("message", handleMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
    };
  }, [preview.origin, preview.url]);

  useEffect(() => {
    if (!readyRef.current) return;
    postDraft();
  }, [draft, preview.origin]);

  return (
    <aside className="admin-theme-preview" aria-label={i18n.t("theme___Vista previa de la carta")}>
      <div className={"admin-theme-preview__header"}>
        <div>
          <div className="admin-kicker">{i18n.t("theme___Vista previa")}</div>
          <p>{i18n.t("theme___La carta real, antes de publicar.")}</p>
        </div>
        <Badge role={"status"} tone={PREVIEW_STATUS_TONES[status]}>
          {PREVIEW_STATUS_LABELS[status]}
        </Badge>
      </div>
      <div className="admin-theme-device">
        <iframe
          className={"admin-theme-device__frame"}
          ref={iframeRef}
          src={preview.url}
          title={i18n.t("theme___Vista previa móvil de la carta de {{host}}", { host })}
        />
        {status === "loading" ? (
          <div className={"admin-theme-preview__overlay"}>{i18n.t("theme___Cargando la carta…")}</div>
        ) : null}
        {status === "error" ? (
          <div className={"admin-theme-preview__overlay admin-theme-preview__overlay--error"}>
            {i18n.t("theme___No se pudo conectar con la carta pública.")}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
