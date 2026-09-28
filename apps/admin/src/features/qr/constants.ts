import { i18n } from "~/lib/i18n";
import { formatNumber } from "~/shared/services/format";

export const QR_SIZE_OPTIONS = [512, 1024, 2048].map((size) => ({
  id: String(size),
  label: i18n.t("qr___{{size}} × {{size}} px", { size: formatNumber(size) }),
}));
export const QR_TARGET_OPTIONS = [
  { id: "menu", label: i18n.t("qr___Carta") },
  { id: "reviews", label: i18n.t("qr___Reseñas de Google") },
  { id: "loyalty", label: i18n.t("qr___Fidelización") },
];
export const PRINT_LAYOUT_OPTIONS = [
  { id: "minimal", label: i18n.t("qr___Minimal"), description: i18n.t("qr___A6 blanco") },
  { id: "branded", label: i18n.t("qr___Branded"), description: i18n.t("qr___A6 con marca") },
  { id: "poster", label: i18n.t("qr___Póster"), description: i18n.t("qr___A4 vertical") },
  { id: "poster-primary", label: i18n.t("qr___Póster primario"), description: i18n.t("qr___A4 con fondo primario") },
] as const;

export type PrintLayout = (typeof PRINT_LAYOUT_OPTIONS)[number]["id"];
