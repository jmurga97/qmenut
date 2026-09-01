import {
  createThemePreviewUpdateMessage,
  isThemePreviewReadyMessage,
  QM_THEME_PREVIEW_SEARCH_PARAM,
  QM_THEME_PREVIEW_SEARCH_VALUE,
} from "@qmenut/ui/theme/tenant-theme-config";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  const deviceRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draftRef = useRef(draft);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const preview = useMemo(() => {
    const url = new URL(buildPublicMenuUrl(host));
    url.searchParams.set(QM_THEME_PREVIEW_SEARCH_PARAM, QM_THEME_PREVIEW_SEARCH_VALUE);
    return { origin: url.origin, url: url.href };
  }, [host]);

  draftRef.current = draft;

  useLayoutEffect(() => {
    let animationFrame = 0;
    let layoutTimeout = 0;
    let scrollTimeout = 0;

    function measureAvailableHeight() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const device = deviceRef.current;
        if (!device) return;

        const deviceTop = device.getBoundingClientRect().top;
        const contentBottom = device.closest(".admin-main-slot")?.getBoundingClientRect().bottom ?? window.innerHeight;
        const availableHeight = Math.max(0, contentBottom - deviceTop);

        device.style.setProperty("--admin-theme-device-height", `${availableHeight}px`);
      });
    }

    function measureAfterScroll() {
      window.clearTimeout(scrollTimeout);
      window.clearTimeout(layoutTimeout);
      scrollTimeout = window.setTimeout(() => {
        measureAvailableHeight();
        layoutTimeout = window.setTimeout(measureAvailableHeight, 200);
      }, 120);
    }

    measureAvailableHeight();
    const settleTimeout = window.setTimeout(measureAvailableHeight, 600);
    window.addEventListener("resize", measureAvailableHeight);
    window.addEventListener("scroll", measureAfterScroll, { capture: true });
    window.visualViewport?.addEventListener("resize", measureAvailableHeight);

    return () => {
      window.clearTimeout(layoutTimeout);
      window.clearTimeout(scrollTimeout);
      window.clearTimeout(settleTimeout);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", measureAvailableHeight);
      window.removeEventListener("scroll", measureAfterScroll, { capture: true });
      window.visualViewport?.removeEventListener("resize", measureAvailableHeight);
    };
  }, []);

  useEffect(() => {
    readyRef.current = false;
    setStatus("loading");

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
      <div className="admin-theme-device" ref={deviceRef}>
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
