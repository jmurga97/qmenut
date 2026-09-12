import {
  createThemePreviewUpdateMessage,
  isThemePreviewReadyMessage,
  QM_THEME_PREVIEW_SEARCH_PARAM,
  QM_THEME_PREVIEW_SEARCH_VALUE,
} from "@qmenut/ui/theme/tenant-theme-config";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildPublicMenuUrl } from "~/shared/services/public-menu-url";

import type { QmTenantThemeEditableConfig } from "@qmenut/ui/theme/tenant-theme-config";

interface ThemePreviewProps {
  draft: QmTenantThemeEditableConfig | null;
  host: string;
}

type PreviewStatus = "error" | "loading" | "ready";

const PREVIEW_STATUS_LABELS: Record<PreviewStatus, string> = {
  error: "No disponible",
  loading: "Cargando",
  ready: "En directo",
};

export function ThemePreview({ draft, host }: ThemePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draftRef = useRef(draft);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const preview = useMemo(() => {
    const url = new URL(buildPublicMenuUrl(host));
    url.searchParams.set(QM_THEME_PREVIEW_SEARCH_PARAM, QM_THEME_PREVIEW_SEARCH_VALUE);
    return { origin: url.origin, url: url.href };
  }, [host]);

  useEffect(() => {
    draftRef.current = draft;
  });

  useEffect(() => {
    function postDraft() {
      const frameWindow = iframeRef.current?.contentWindow;
      const currentDraft = draftRef.current;
      if (!frameWindow || !currentDraft) return;

      frameWindow.postMessage(createThemePreviewUpdateMessage(currentDraft), preview.origin);
    }

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
    const frameWindow = iframeRef.current?.contentWindow;
    if (!readyRef.current || !frameWindow || !draft) return;

    frameWindow.postMessage(createThemePreviewUpdateMessage(draft), preview.origin);
  }, [draft, preview.origin]);

  return (
    <aside className="admin-theme-preview" aria-label="Vista previa de la carta">
      <div className="admin-theme-preview__header">
        <div>
          <div className="admin-kicker">Vista previa</div>
          <p>La carta real, antes de publicar.</p>
        </div>
        <span className={`admin-theme-preview__status admin-theme-preview__status--${status}`} role="status">
          {PREVIEW_STATUS_LABELS[status]}
        </span>
      </div>
      <div className="admin-theme-device">
        <iframe
          className="admin-theme-device__frame"
          ref={iframeRef}
          src={preview.url}
          title={`Vista previa móvil de la carta de ${host}`}
        />
        {status === "loading" ? <div className="admin-theme-preview__overlay">Cargando la carta…</div> : null}
        {status === "error" ? (
          <div className="admin-theme-preview__overlay admin-theme-preview__overlay--error">
            No se pudo conectar con la carta pública.
          </div>
        ) : null}
      </div>
    </aside>
  );
}
