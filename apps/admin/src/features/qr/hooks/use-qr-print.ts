import { useLogoState, usePrintFonts, useQrSvg } from "~/shared/hooks/use-print-assets";
import { usePrintDocument } from "~/shared/hooks/use-print-document";

import type { PrintLayout } from "../constants";
import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

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
  const { svg: qrSvg } = useQrSvg(url);
  const logoState = useLogoState(logoUrl);
  const fontState = usePrintFonts(theme);
  const printReady = Boolean(qrSvg) && logoState !== "loading" && fontState === "ready";
  const { print, printableRef } = usePrintDocument({
    ready: printReady,
    pageSize: layout.startsWith("poster") ? "210mm 297mm" : "105mm 148mm",
    outputClass: "admin-qr-print-output",
    bodyClass: "admin-qr-printing",
  });
  return { qrSvg, logoState, fontState, printReady, print, printableRef };
}
