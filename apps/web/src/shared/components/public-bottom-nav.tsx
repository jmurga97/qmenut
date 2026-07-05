import { QmTab } from "@qmenut/ui/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Gift, Phone, Tag, UtensilsCrossed } from "lucide-react";

const NAV_ICON_SIZE = 19;
const NAV_ICON_STROKE_WIDTH = 1.9;

export function PublicBottomNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <qm-nav-bar aria-label="Navegación principal">
      <QmTab value="/" active={pathname === "/"} onQmSelect={() => void navigate({ to: "/" })}>
        <UtensilsCrossed slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        Inicio
      </QmTab>
      <QmTab value="/promos" active={pathname === "/promos"} onQmSelect={() => void navigate({ to: "/promos" })}>
        <Tag slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        Promos
      </QmTab>
      <QmTab value="/contacto" active={pathname === "/contacto"} onQmSelect={() => void navigate({ to: "/contacto" })}>
        <Phone slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        Contacto
      </QmTab>
      <QmTab value="/puntos" active={pathname === "/puntos"} onQmSelect={() => void navigate({ to: "/puntos" })}>
        <Gift slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        Puntos
      </QmTab>
    </qm-nav-bar>
  );
}
