import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { useEffect, useState } from "react";

import { notifyError } from "~/lib/notifications";

import { renderQrSvg } from "../services";

import type { PrintLayout } from "../constants";
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

function useQrSvg(url: string | null) {
  const [result, setResult] = useState<{ svg: string; url: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    let active = true;
    void renderQrSvg(url)
      .then((svg) => {
        if (active) setResult({ svg, url });
      })
      .catch(notifyError);
    return () => {
      active = false;
    };
  }, [url]);
  return result?.url === url ? result.svg : null;
}

function useLogoState(logoUrl: string | null) {
  const [result, setResult] = useState<{ status: "ready" | "error"; url: string } | null>(null);
  useEffect(() => {
    if (!logoUrl) return;
    const image = new Image();
    image.addEventListener("load", () => setResult({ status: "ready", url: logoUrl }), { once: true });
    image.addEventListener("error", () => setResult({ status: "error", url: logoUrl }), { once: true });
    image.src = logoUrl;
    return () => {
      image.src = "";
    };
  }, [logoUrl]);
  if (!logoUrl) return "ready";
  if (result?.url !== logoUrl) return "loading";
  return result.status;
}

function usePrintFonts(theme: QmTenantThemeConfig) {
  const vars = buildQmThemeVars(theme);
  const heading = `${vars["--qm-hw"]} 16px ${vars["--qm-heading"]}`;
  const body = `400 16px ${vars["--qm-body"]}`;
  const key = heading + body;
  const [result, setResult] = useState<{ key: string; status: "ready" | "error" } | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([document.fonts.load(heading), document.fonts.load(body)])
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
  }, [heading, body, key]);
  return result?.key === key ? result.status : "loading";
}

export function useQrPrint({
  url,
  logoUrl,
  theme,
  layout,
}: {
  url: string | null;
  logoUrl: string | null;
  theme: QmTenantThemeConfig;
  layout: PrintLayout;
}) {
  const qrSvg = useQrSvg(url);
  const logoState = useLogoState(logoUrl);
  const fontState = usePrintFonts(theme);
  const printReady = Boolean(qrSvg) && logoState !== "loading" && fontState === "ready";

  function print() {
    if (!printReady) return;
    const printStyle = document.createElement("style");
    printStyle.dataset.qrPrint = "true";
    printStyle.textContent = `@page { size: ${layout === "poster" ? "A4" : "A6"} portrait; margin: 0; }`;
    (document.head as ParentNode).append(printStyle);
    document.body.classList.add("admin-qr-printing");
    try {
      window.print();
    } finally {
      document.body.classList.remove("admin-qr-printing");
      printStyle.remove();
    }
  }
  return { qrSvg, logoState, fontState, printReady, print };
}
