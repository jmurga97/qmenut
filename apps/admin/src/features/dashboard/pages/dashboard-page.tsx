import { useSuspenseQuery } from "@tanstack/react-query";

import { VenueCodeCard } from "~/features/loyalty/components/venue-code-card";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { PageHeader } from "~/shared/components/page-header";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { AnalyticsPulseCard } from "../components/analytics-pulse-card";
import { AttentionPanel } from "../components/attention-panel";
import { AvailabilityCard } from "../components/availability-card";
import { PendingRedemptionsCard } from "../components/pending-redemptions-card";
import { ServiceMetrics } from "../components/service-metrics";
import { VisitsChartCard } from "../components/visits-chart-card";

export function DashboardPage() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const branch = useSelectedBranch();
  const canInsights = useCan("loyalty.insights");
  const canOperate = useCan("loyalty.operate");
  const canToggleAvailability = useCan("menu.toggleDishAvailability");
  const canSeeAttention = useCan("branch.write");
  const showServiceZone = canInsights || canSeeAttention;
  return (
    <div className="admin-page admin-dashboard">
      <PageHeader
        description={branch ? (branch.customDomain ?? "Sin dominio público todavía.") : undefined}
        kicker={branch ? `Panel diario · ${branch.name}` : "Panel diario"}
        title={tenant.restaurant.name}
      />
      {showServiceZone ? (
        <div className="admin-dashboard-top">
          {canInsights ? <ServiceMetrics /> : null}
          <AttentionPanel />
        </div>
      ) : null}
      {canInsights ? <AnalyticsPulseCard /> : null}
      {canInsights || canOperate ? (
        <div className="admin-dashboard-bottom">
          {canInsights ? <VisitsChartCard /> : null}
          {canOperate && branch ? (
            <div className="admin-dashboard-ops">
              <VenueCodeCard
                branchId={branch.id}
                compact
                description="Cambia solo. Compártelo para que tus clientes sumen sellos."
                heading="Código de la sucursal"
              />
              <PendingRedemptionsCard />
            </div>
          ) : null}
        </div>
      ) : null}
      {canToggleAvailability ? <AvailabilityCard /> : null}
    </div>
  );
}
