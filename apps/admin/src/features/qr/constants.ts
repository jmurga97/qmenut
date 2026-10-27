import { i18n } from "~/lib/i18n";
import { formatNumber } from "~/shared/services/format";

import type { QrTarget } from "~/shared/services/qr";

export const QR_SIZE_OPTIONS = [512, 1024, 2048].map((size) => ({
  id: String(size),
  label: i18n.t("qr___{{size}} × {{size}} px", { size: formatNumber(size) }),
}));
export const QR_TARGET_OPTIONS = [
  { id: "menu", label: i18n.t("qr___Carta") },
  { id: "reviews", label: i18n.t("qr___Reseñas de Google") },
  { id: "loyalty", label: i18n.t("qr___Fidelización") },
] satisfies { id: QrTarget; label: string }[];
export const QR_STYLE_OPTIONS = [
  { id: "plain", label: i18n.t("qr___Sin marca") },
  { id: "light", label: i18n.t("qr___Marca sobre blanco") },
  { id: "colour", label: i18n.t("qr___Color de marca") },
] as const;

export const QR_TABLE_SIZES = [
  { id: "small", label: i18n.t("qr___Pequeño · 4 × 4 cm"), mm: 40, columns: 4, rows: 6 },
  { id: "medium", label: i18n.t("qr___Mediano · 5 × 5 cm"), mm: 50, columns: 3, rows: 5 },
  { id: "large", label: i18n.t("qr___Grande · 6 × 6 cm"), mm: 60, columns: 3, rows: 4 },
] as const;

export const QR_PAPER_SIZES = [
  { id: "a6", label: i18n.t("qr___Pequeño · A6"), width: 105, height: 148 },
  { id: "a5", label: i18n.t("qr___Mediano · A5"), width: 148, height: 210 },
  { id: "a4", label: i18n.t("qr___Grande · A4"), width: 210, height: 297 },
  { id: "a3", label: i18n.t("qr___Póster · A3"), width: 297, height: 420 },
] as const;

// Endonyms: each language is named in itself, whatever the admin's own language.
export const QR_PRINT_LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
] as const;

export type QrPrintMode = "tables" | "flyer";
export type QrPrintStyle = (typeof QR_STYLE_OPTIONS)[number]["id"];
export type QrPrintLanguage = (typeof QR_PRINT_LANGUAGES)[number]["id"];

// Printed copy follows the chosen print language, not the admin UI language.
export function getQrPrintCopy(language: QrPrintLanguage): Record<QrTarget, { label: string; instruction: string }> {
  const t = i18n.getFixedT(language);
  return {
    menu: { label: t("qr___Carta"), instruction: t("qr___Escanea para ver la carta") },
    reviews: { label: t("qr___¿Te ha gustado?"), instruction: t("qr___Déjanos una reseña en Google") },
    loyalty: { label: t("qr___Premios"), instruction: t("qr___Escanea y suma sellos en cada visita") },
  };
}
