import { useSearch } from "@tanstack/react-router";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import "~/features/loyalty/styles.css";
import { LoyaltyExperience } from "~/features/loyalty/components/loyalty-experience";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

export function LoyaltyPage() {
  const { t } = useTranslation();
  const { tenant } = usePublicRouteLayout();
  const { utm_source: utmSource } = useSearch({ from: "/{-$locale}" });

  useTrackPageView("loyalty_view", { from_qr: utmSource === "qr" });

  return (
    <div className="loyalty-page">
      <Suspense fallback={<div className="loyalty-loading" aria-label={t("loyalty.loading")} />}>
        <LoyaltyExperience restaurantName={tenant.tenantName} />
      </Suspense>
    </div>
  );
}
