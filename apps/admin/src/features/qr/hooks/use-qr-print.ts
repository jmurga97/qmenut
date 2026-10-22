import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

import { useLogoState, usePrintFonts, useQrSvg } from "~/shared/hooks/use-print-assets";
import { usePrintDocument } from "~/shared/hooks/use-print-document";

import type { QrPrintStyle } from "../constants";
import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import type { QrTarget } from "~/shared/services/qr";

export function useQrPrint({
  urls,
  targets,
  logoUrl,
  theme,
  style,
  pageSize,
}: {
  urls: Record<QrTarget, string | null>;
  targets: QrTarget[];
  logoUrl: string | null;
  theme: QmTenantThemeConfig | null;
  style: QrPrintStyle;
  pageSize: string;
}) {
  const codes = {
    menu: useQrSvg(urls.menu),
    reviews: useQrSvg(urls.reviews),
    loyalty: useQrSvg(urls.loyalty),
  };
  const branded = style !== "plain";
  const logoState = useLogoState(branded ? logoUrl : null);
  const fontState = usePrintFonts(theme ?? resolveTenantThemeConfig(null), branded && Boolean(theme));
  const qrError = targets.some((target) => codes[target].error);
  const printReady =
    targets.length > 0 &&
    targets.every((target) => Boolean(codes[target].svg)) &&
    (!branded || Boolean(theme)) &&
    logoState !== "loading" &&
    fontState === "ready";
  const { print, printableRef } = usePrintDocument({
    ready: printReady,
    pageSize,
    outputClass: "admin-qr-print-output",
    bodyClass: "admin-qr-printing",
  });
  return { codes, logoState, fontState, qrError, printReady, print, printableRef };
}
