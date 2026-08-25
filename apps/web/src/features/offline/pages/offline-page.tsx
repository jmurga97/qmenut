import { useParams, useSearch } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { track } from "~/lib/analytics/posthog";
import { useTrackPageView } from "~/lib/analytics/use-analytics";

export function OfflinePage() {
  const { t } = useTranslation();
  const { locale } = useParams({ from: "/{-$locale}/offline" });
  const { returnTo } = useSearch({ from: "/{-$locale}/offline" });
  const retryUrl = returnTo ?? (locale ? `/${locale}` : "/");

  useTrackPageView("offline_view");

  function handleRetry() {
    track("offline_retry_clicked");
    window.location.assign(retryUrl);
  }

  return (
    <div className="public-route-content-stage">
      <section className="offline-surface">
        {/* The route header already renders the page title as the h1. */}
        <WifiOff aria-hidden="true" className="offline-surface__icon" size={32} strokeWidth={1.5} />
        <p className="offline-surface__body">{t("offline.body")}</p>
        <button className="offline-surface__action" onClick={handleRetry} type="button">
          {t("offline.retry")}
        </button>
      </section>
    </div>
  );
}
