import type { TFunction } from "i18next";

export function getStandardHeaderCopy(routeId: string | undefined, t: TFunction) {
  switch (routeId) {
    case "/{-$locale}/destacados":
      return { subtitle: t("destacados.page.subtitle"), title: t("destacados.page.title") };
    case "/{-$locale}/contacto":
      return { subtitle: t("contact.page.subtitle"), title: t("contact.page.title") };
    case "/{-$locale}/puntos":
      return { subtitle: t("loyalty.page.subtitle"), title: t("loyalty.page.title") };
    case "/{-$locale}/aviso-legal":
      return { subtitle: t("legal.legalNotice.subtitle"), title: t("legal.legalNotice.title") };
    case "/{-$locale}/privacidad":
      return { subtitle: t("legal.privacy.subtitle"), title: t("legal.privacy.title") };
    case undefined:
    default:
      return { subtitle: "", title: t("common.navigation.menu") };
  }
}
