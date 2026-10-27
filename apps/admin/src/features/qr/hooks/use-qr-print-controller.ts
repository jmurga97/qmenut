import { useLayoutEffect, useState } from "react";

import { i18n } from "~/lib/i18n";
import { useFeature } from "~/shared/hooks/use-can";
import { buildQrUrl } from "~/shared/services/qr";

import { useQrController } from "./use-qr-controller";
import { useQrPrint } from "./use-qr-print";
import { QR_PAPER_SIZES, QR_PRINT_LANGUAGES, QR_STYLE_OPTIONS, QR_TABLE_SIZES, QR_TARGET_OPTIONS } from "../constants";

import type { QrPrintBranch } from "../components/qr-print-document";
import type { QrPrintMode } from "../constants";
import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import type { QrTarget } from "~/shared/services/qr";

export interface QrPrintInput {
  branch: QrPrintBranch;
  host: string;
  mode: QrPrintMode;
  theme: QmTenantThemeConfig | null;
}

export function useQrPrintController({ branch, host, mode, theme }: QrPrintInput) {
  const controller = useQrController({ domain: host, googlePlaceId: branch.googlePlaceId });
  const [styleId, setStyleId] = useState(mode === "tables" ? "plain" : "light");
  const [sizeId, setSizeId] = useState("small");
  const [paperId, setPaperId] = useState("a6");
  const [quantityInput, setQuantityInput] = useState("15");
  const [flyerTargets, setFlyerTargets] = useState<QrTarget[]>(["menu"]);
  const [languageId, setLanguageId] = useState<string>(i18n.resolvedLanguage ?? "es");
  // Loyalty and Google reviews are Business features: Basic only prints the menu QR.
  const hasLoyalty = useFeature("loyalty");
  const hasReviews = useFeature("contact.googleReviews");
  const targetOptions = QR_TARGET_OPTIONS.filter(
    (option) => (option.id !== "loyalty" || hasLoyalty) && (option.id !== "reviews" || hasReviews),
  );
  const style = QR_STYLE_OPTIONS.find((option) => option.id === styleId)?.id ?? "plain";
  const language = QR_PRINT_LANGUAGES.find((option) => option.id === languageId)?.id ?? "es";
  const tableSize = QR_TABLE_SIZES.find((option) => option.id === sizeId) ?? QR_TABLE_SIZES[0];
  const paper = QR_PAPER_SIZES.find((option) => option.id === paperId) ?? QR_PAPER_SIZES[0];
  const quantity = Number(quantityInput);
  const quantityValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 300;
  const targets = mode === "tables" ? [controller.target] : flyerTargets;
  const urls = {
    menu: buildQrUrl({ domain: host, target: "menu" }),
    reviews: branch.googlePlaceId
      ? buildQrUrl({ domain: host, googlePlaceId: branch.googlePlaceId, target: "reviews" })
      : null,
    loyalty: buildQrUrl({ domain: host, target: "loyalty" }),
  };
  const assets = useQrPrint({
    urls,
    targets,
    logoUrl: branch.logoUrl,
    theme,
    style,
    pageSize: mode === "tables" ? "210mm 297mm" : `${paper.width}mm ${paper.height}mm`,
  });
  const contentKey = JSON.stringify({ mode, style, language, tableSize, paper, quantity, targets, branch, theme });
  const [fit, setFit] = useState({ key: "", fits: false });
  const ready = assets.printReady && (mode !== "tables" || quantityValid);
  useLayoutEffect(() => {
    if (!ready || !assets.printableRef.current) return;
    const nodes = [...assets.printableRef.current.querySelectorAll<HTMLElement>("[data-qr-fit]")];
    const measure = () => {
      const fits = nodes.every(
        (node) => node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1,
      );
      setFit((previous) =>
        previous.key === contentKey && previous.fits === fits ? previous : { key: contentKey, fits },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [assets.printableRef, contentKey, ready]);
  const canPrint = ready && fit.key === contentKey && fit.fits;
  const pageCount = Math.ceil(quantity / (tableSize.columns * tableSize.rows));
  let previewLabel = `${paper.id.toUpperCase()} · ${paper.width} × ${paper.height} mm`;
  if (mode === "tables") {
    previewLabel = quantityValid
      ? i18n.t("qr___{{quantity}} QR · A4 · {{pages}} pág.", { quantity, pages: pageCount })
      : "A4 · 210 × 297 mm";
  }
  const status = getPrintStatus({
    canPrint,
    missingGoogle: targets.includes("reviews") && !branch.googlePlaceId,
    missingTheme: style !== "plain" && !theme,
    failed: assets.fontState === "error" || assets.qrError,
    overflow: ready && fit.key === contentKey && !fit.fits,
    empty: targets.length === 0,
    invalidQuantity: mode === "tables" && !quantityValid,
  });
  return {
    controller,
    style,
    sizeId,
    setSizeId,
    paperId,
    setPaperId,
    quantityInput,
    setQuantityInput,
    flyerTargets,
    setFlyerTargets,
    setStyleId,
    language,
    setLanguageId,
    targetOptions,
    tableSize,
    paper,
    quantity,
    quantityValid,
    targets,
    assets,
    canPrint,
    previewLabel,
    status,
  };
}

function getPrintStatus(state: {
  canPrint: boolean;
  missingGoogle: boolean;
  missingTheme: boolean;
  failed: boolean;
  overflow: boolean;
  empty: boolean;
  invalidQuantity: boolean;
}) {
  if (state.failed) return i18n.t("qr___No se pudo preparar la impresión. Recarga la página para volver a intentarlo.");
  if (state.invalidQuantity) return i18n.t("qr___Indica una cantidad entre 1 y 300.");
  if (state.empty) return i18n.t("qr___Selecciona al menos un destino para el folleto.");
  if (state.missingGoogle)
    return i18n.t("qr___Conecta la ficha de Google de esta sucursal para generar el QR de reseñas.");
  if (state.missingTheme) return i18n.t("qr___Esperando el tema de la sucursal. También puedes elegir «Sin marca».");
  if (state.overflow) return i18n.t("qr___El contenido no cabe. Elige «Sin marca» o reduce los destinos del folleto.");
  if (state.canPrint) return i18n.t("qr___Listo para imprimir.");
  return i18n.t("qr___Preparando el QR y la identidad visual…");
}
