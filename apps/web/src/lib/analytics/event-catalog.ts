import type { InstallMode } from "~/features/install/use-install-prompt";
import type { DishOpenSource } from "~/features/menu/types/menu-view-model";

/** Canal de una acción de contacto, clasificado desde el href del enlace. */
export type ContactActionChannel = "map" | "phone" | "social" | "whatsapp";

export type DisplayMode = "browser" | "standalone";

/**
 * Catálogo cerrado de eventos anónimos de la carta. `track()` solo acepta nombres de este
 * mapa y payloads con la forma declarada: un nombre o propiedad incorrecta no compila.
 * Los eventos sin propiedades se declaran con `Record<string, never>`.
 */
export interface AnalyticsEventPayloads {
  contact_action_tapped: { channel: ContactActionChannel };
  contact_view: Record<string, never>;
  dish_opened: { dish_id: string; dish_name: string; source: DishOpenSource };
  highlights_view: Record<string, never>;
  language_changed: { from: string; to: string };
  loyalty_view: Record<string, never>;
  menu_category_reached: {
    category: string;
    category_id: string | null;
    position: number;
    total: number;
  };
  menu_category_selected: { category: string; category_id: string | null };
  menu_view: { from_qr: boolean };
  offline_retry_clicked: Record<string, never>;
  offline_view: Record<string, never>;
  promo_opened: { name?: string; promotion_id: string | null; source: "featured" };
  pwa_install_card_dismissed: Record<string, never>;
  pwa_install_card_shown: { mode: InstallMode };
  pwa_install_prompt_accepted: Record<string, never>;
  pwa_install_prompt_dismissed: Record<string, never>;
  pwa_installed: Record<string, never>;
  /** Carga atribuible a un enlace QR (utm_source=qr); no equivale a escaneo ni visitante único. */
  qr_visit: Record<string, never>;
}

export type AnalyticsEventName = keyof AnalyticsEventPayloads;

type NoProps = Record<string, never>;

/** `[]` para eventos sin payload, `[payload]` (obligatorio) para el resto. */
export type TrackArgs<E extends AnalyticsEventName> = AnalyticsEventPayloads[E] extends NoProps
  ? []
  : [props: AnalyticsEventPayloads[E]];

/** Dimensiones comunes adjuntas a todos los eventos una vez registrado el tenant. */
export interface AnalyticsTenantContextInput {
  branchId: string;
  displayMode: DisplayMode;
  /** Zona horaria del restaurante (p. ej. "Europe/Madrid") para analytics_day/analytics_hour. */
  locale: string;
  restaurantId: string;
  tenantHost: string;
  timeZone: string;
}
