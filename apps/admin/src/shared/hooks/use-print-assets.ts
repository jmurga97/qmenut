import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { useEffect, useState } from "react";

import { notifyError } from "~/lib/notifications";
import { renderQrSvg } from "~/shared/services/qr";

import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import "@qmenut/ui/fonts/anton.css";
import "@qmenut/ui/fonts/barlow.css";
import "@qmenut/ui/fonts/bebas-neue.css";
import "@qmenut/ui/fonts/cormorant-garamond.css";
import "@qmenut/ui/fonts/dm-sans.css";
import "@qmenut/ui/fonts/jost.css";
import "@qmenut/ui/fonts/nunito-sans.css";
import "@qmenut/ui/fonts/playfair-display.css";
import "@qmenut/ui/fonts/quicksand.css";
import "@qmenut/ui/fonts/spectral.css";
import "@qmenut/ui/fonts/work-sans.css";
import "@qmenut/ui/fonts/yeseva-one.css";

export function useQrSvg(url: string | null) {
  const [result, setResult] = useState<{ svg: string | null; url: string; error: boolean } | null>(null);
  useEffect(() => {
    if (!url) return;
    let active = true;
    void renderQrSvg(url)
      .then((svg) => {
        if (active) setResult({ svg, url, error: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult({ svg: null, url, error: true });
        notifyError(error);
      });
    return () => {
      active = false;
    };
  }, [url]);
  return { svg: result?.url === url ? result.svg : null, error: result?.url === url && result.error };
}

export function useLogoState(logoUrl: string | null) {
  const [result, setResult] = useState<{ status: "ready" | "error"; url: string } | null>(null);
  useEffect(() => {
    if (!logoUrl) return;
    let active = true;
    const image = new Image();
    image.addEventListener(
      "load",
      () => {
        if (active) setResult({ status: "ready", url: logoUrl });
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        if (active) setResult({ status: "error", url: logoUrl });
      },
      { once: true },
    );
    image.src = logoUrl;
    return () => {
      active = false;
      image.src = "";
    };
  }, [logoUrl]);
  if (!logoUrl) return "ready";
  if (result?.url !== logoUrl) return "loading";
  return result.status;
}

export function usePrintFonts(theme: QmTenantThemeConfig) {
  const vars = buildQmThemeVars(theme);
  const requests = [
    ...new Set([
      `${vars["--qm-hw"]} 16px ${vars["--qm-heading"]}`,
      `${vars["--qm-dish-weight"]} 16px ${vars["--qm-heading"]}`,
      `${vars["--qm-price-weight"]} 16px ${vars["--qm-heading"]}`,
      `400 16px ${vars["--qm-body"]}`,
      `600 16px ${vars["--qm-body"]}`,
    ]),
  ];
  const key = JSON.stringify(requests);
  const [result, setResult] = useState<{ key: string; status: "ready" | "error" } | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all((JSON.parse(key) as string[]).map((font) => document.fonts.load(font)))
      .then((faces) => {
        if (faces.some((family) => family.length === 0)) throw new Error("No se encontraron las tipografías del menú.");
        if (active) setResult({ key, status: "ready" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult({ key, status: "error" });
        notifyError(error);
      });
    return () => {
      active = false;
    };
  }, [key]);
  return result?.key === key ? result.status : "loading";
}
