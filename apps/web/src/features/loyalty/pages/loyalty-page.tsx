import { useSearch } from "@tanstack/react-router";

import { LoyaltyExperience } from "~/features/loyalty/components/loyalty-experience";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

export function LoyaltyPage() {
  const { tenant } = usePublicRouteLayout();
  const { utm_source: utmSource } = useSearch({ from: "/{-$locale}" });

  useTrackPageView("loyalty_view", { from_qr: utmSource === "qr" });

  return (
    <div className="loyalty-page">
      <LoyaltyExperience restaurantName={tenant.tenantName} />
    </div>
  );
}
