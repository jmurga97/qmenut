import { useParams, useSearch } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export function OfflinePage() {
  const { t } = useTranslation();
  const { locale } = useParams({ from: "/{-$locale}/offline" });
  const { returnTo } = useSearch({ from: "/{-$locale}/offline" });
  const retryUrl = returnTo ?? (locale ? `/${locale}` : "/");

  return (
    <div className="public-route-content-stage">
      <section className="offline-surface">
        {/* The route header already renders the page title as the h1. */}
        <WifiOff aria-hidden="true" className="offline-surface__icon" size={32} strokeWidth={1.5} />
        <p className="offline-surface__body">{t("offline.body")}</p>
        <button className="offline-surface__action" onClick={() => window.location.assign(retryUrl)} type="button">
          {t("offline.retry")}
        </button>
      </section>
    </div>
  );
}
