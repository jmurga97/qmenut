import { QmNavBar } from "@qmenut/ui/components/qm-nav-bar/react";
import { QmTab } from "@qmenut/ui/components/qm-tab/react";
import { useNavigate, useRouter, useRouterState, useSearch } from "@tanstack/react-router";
import { Gift, Phone, Tag, UtensilsCrossed } from "lucide-react";
import { useTranslation } from "react-i18next";

const NAV_ICON_SIZE = 19;
const NAV_ICON_STROKE_WIDTH = 1.9;

export function PublicBottomNav({ showLoyalty }: { showLoyalty: boolean }) {
  const navigate = useNavigate();
  const router = useRouter();
  const search = useSearch({ from: "/{-$locale}" });
  const { t } = useTranslation();
  // Matched by route id (not pathname) so the active tab is correct regardless of
  // whether a locale prefix (e.g. "/en") is present in the URL.
  const routeId = useRouterState({ select: (state) => state.matches.at(-1)?.routeId });

  function preloadHighlights() {
    void router.preloadRoute({
      to: "/{-$locale}/destacados",
      params: (prev) => prev,
      search,
    });
  }

  function preloadContact() {
    void router.preloadRoute({
      to: "/{-$locale}/contacto",
      params: (prev) => prev,
      search,
    });
  }

  function preloadLoyalty() {
    void router.preloadRoute({
      to: "/{-$locale}/puntos",
      params: (prev) => prev,
      search,
    });
  }

  return (
    <QmNavBar aria-label={t("common.primaryNavigationLabel")}>
      <QmTab
        value="/"
        active={routeId === "/{-$locale}/"}
        onQmSelect={() => void navigate({ to: "/{-$locale}", params: (prev) => prev, search })}
      >
        <UtensilsCrossed slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        {t("common.navigation.menu")}
      </QmTab>
      <QmTab
        value="/destacados"
        active={routeId === "/{-$locale}/destacados"}
        onPointerEnter={preloadHighlights}
        onFocus={preloadHighlights}
        onTouchStart={preloadHighlights}
        onQmSelect={() => void navigate({ to: "/{-$locale}/destacados", params: (prev) => prev, search })}
      >
        <Tag slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        {t("common.navigation.destacados")}
      </QmTab>
      <QmTab
        value="/contacto"
        active={routeId === "/{-$locale}/contacto"}
        onPointerEnter={preloadContact}
        onFocus={preloadContact}
        onTouchStart={preloadContact}
        onQmSelect={() => void navigate({ to: "/{-$locale}/contacto", params: (prev) => prev, search })}
      >
        <Phone slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
        {t("common.navigation.contact")}
      </QmTab>
      {showLoyalty ? (
        <QmTab
          value="/puntos"
          active={routeId === "/{-$locale}/puntos"}
          onPointerEnter={preloadLoyalty}
          onFocus={preloadLoyalty}
          onTouchStart={preloadLoyalty}
          onQmSelect={() => void navigate({ to: "/{-$locale}/puntos", params: (prev) => prev, search })}
        >
          <Gift slot="icon" size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE_WIDTH} />
          {t("common.navigation.loyalty")}
        </QmTab>
      ) : null}
    </QmNavBar>
  );
}
