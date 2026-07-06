import { QmTab } from "@qmenut/ui/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Gift, Phone, Tag, UtensilsCrossed } from "lucide-react";

const NAV_ICON_SIZE = 19;
const NAV_ICON_STROKE_WIDTH = 1.9;

export function PublicBottomNav() {
  const navigate = useNavigate();
  // Matched by route id (not pathname) so the active tab is correct regardless of
  // whether a locale prefix (e.g. "/en") is present in the URL.
  const routeId = useRouterState({ select: (state) => state.matches.at(-1)?.routeId });

  return (
    <qm-nav-bar aria-label="Navegación principal">
      <QmTab
        value="/"
        active={routeId === "/{-$locale}/"}
        onQmSelect={() => void navigate({ to: "/{-$locale}", params: (prev) => prev })}
      >
        <UtensilsCrossed slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        Inicio
      </QmTab>
      <QmTab
        value="/promos"
        active={routeId === "/{-$locale}/promos"}
        onQmSelect={() => void navigate({ to: "/{-$locale}/promos", params: (prev) => prev })}
      >
        <Tag slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        Promos
      </QmTab>
      <QmTab
        value="/contacto"
        active={routeId === "/{-$locale}/contacto"}
        onQmSelect={() => void navigate({ to: "/{-$locale}/contacto", params: (prev) => prev })}
      >
        <Phone slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        Contacto
      </QmTab>
      <QmTab
        value="/puntos"
        active={routeId === "/{-$locale}/puntos"}
        onQmSelect={() => void navigate({ to: "/{-$locale}/puntos", params: (prev) => prev })}
      >
        <Gift slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        Puntos
      </QmTab>
    </qm-nav-bar>
  );
}
