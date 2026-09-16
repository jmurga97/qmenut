export const QR_SIZE_OPTIONS = [512, 1024, 2048].map((size) => ({ id: String(size), label: `${size} × ${size} px` }));
export const QR_TARGET_OPTIONS = [
  { id: "menu", label: "Carta" },
  { id: "reviews", label: "Reseñas de Google" },
  { id: "loyalty", label: "Fidelización" },
];
export const PRINT_LAYOUT_OPTIONS = [
  { id: "minimal", label: "Minimal", description: "A6 blanco" },
  { id: "branded", label: "Branded", description: "A6 con marca" },
  { id: "poster", label: "Póster", description: "A4 vertical" },
  { id: "poster-primary", label: "Póster primario", description: "A4 con fondo primario" },
] as const;

export type PrintLayout = (typeof PRINT_LAYOUT_OPTIONS)[number]["id"];
