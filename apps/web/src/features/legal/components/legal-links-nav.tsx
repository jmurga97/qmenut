import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function LegalLinksNav() {
  const { t } = useTranslation();

  return (
    <nav className="legal-links" aria-label={t("legal.navLabel")}>
      <Link to="/{-$locale}/aviso-legal" params={(prev) => prev}>
        {t("legal.legalNoticeLink")}
      </Link>
      <Link to="/{-$locale}/privacidad" params={(prev) => prev}>
        {t("legal.privacyLink")}
      </Link>
    </nav>
  );
}
