import { useEffect, useRef, useState } from "react";

import { TURNSTILE_SITE_KEY } from "../../lib/api";
import {
  buildDefaultTenantThemeConfig,
  createThemePreviewUpdateMessage,
  isThemePreviewReadyMessage,
} from "../../lib/theme-preview";

export type Template = "fine" | "her" | "fast" | "cafe" | "tapas";

declare global {
  interface Window {
    turnstile?: { render(element: HTMLElement, options: Record<string, unknown>): string };
  }
}

/** Cloudflare Turnstile, loaded only on the account step. A token is single-use: remount for a new one. */
export function Turnstile({ onToken }: { onToken: (patch: { token: string | null }) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let rendered = false;
    const render = () => {
      if (!container.current || !window.turnstile || rendered) return;
      rendered = true;
      window.turnstile.render(container.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: "es",
        callback: (token: string) => onToken({ token }),
        "expired-callback": () => onToken({ token: null }),
      });
    };
    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.addEventListener("load", render);
    document.head.append(script);
  }, [onToken]);
  return <div ref={container} />;
}

// The template tenants live on the dev web Worker, which accepts preview messages from this landing.
function previewUrl(template: Template): string {
  return import.meta.env.DEV
    ? `http://${template}.localhost:5173/?themePreview=admin`
    : `https://${template}.dev.qmenut.app/?themePreview=admin`;
}

/** A template demo repainted with the chosen colors, through the admin's theme-preview messages. */
export function Preview({ template, primary, secondary }: { template: Template; primary: string; secondary: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [readyOrigin, setReadyOrigin] = useState<string | null>(null);
  const src = previewUrl(template);
  const origin = new URL(src).origin;

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin === origin && isThemePreviewReadyMessage(event.data)) setReadyOrigin(`${src}`);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin, src]);

  useEffect(() => {
    if (readyOrigin !== src) return;
    const { showMenuPhotos, showDishPhoto } = buildDefaultTenantThemeConfig(template);
    frame.current?.contentWindow?.postMessage(
      createThemePreviewUpdateMessage({ template, primary, secondary, showMenuPhotos, showDishPhoto }),
      origin,
    );
  }, [readyOrigin, src, template, primary, secondary, origin]);

  return (
    <iframe
      className="signup-preview"
      ref={frame}
      referrerPolicy="origin"
      src={src}
      title={`Vista previa de la plantilla ${template}`}
    />
  );
}
