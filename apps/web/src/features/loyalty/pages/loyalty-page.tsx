import { LoyaltyExperience } from "~/features/loyalty/components/loyalty-experience";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

export function LoyaltyPage() {
  const { tenant } = usePublicRouteLayout();

  useTrackPageView("loyalty_view");

  return (
    <div className="loyalty-page">
      <LoyaltyExperience restaurantName={tenant.tenantName} />
    </div>
  );
}
