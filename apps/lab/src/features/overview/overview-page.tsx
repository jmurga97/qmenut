import { InlineMessage, OverviewPanel, ResourceTable } from "@jmurga97/components";
import { useQuery } from "@tanstack/react-query";

import { errorMessage } from "~/lib/query-client";
import { trpc } from "~/lib/trpc";
import { count, percent, usd } from "~/shared/format";
import { PageHeader } from "~/shared/page";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Group = LabOutputs["overview"]["groups"][number];

const dash = (group: Group, value: number) => (group.source === "invited" ? count(value) : "—");

const columns: ResourceTableColumn<Group>[] = [
  {
    id: "group",
    header: "Grupo",
    render: (group) => `${group.source === "invited" ? "Invitados" : "Público"} · ${usd(group.rewardCents)}`,
  },
  { id: "invited", header: "Invitados", align: "end", render: (group) => dash(group, group.invited) },
  { id: "sent", header: "Enviados", align: "end", render: (group) => dash(group, group.sent) },
  { id: "visited", header: "Visitas", align: "end", render: (group) => dash(group, group.visited) },
  { id: "participants", header: "Verificados", align: "end", render: (group) => count(group.participants) },
  { id: "referrals", header: "Referidos", align: "end", render: (group) => count(group.referrals) },
  { id: "approved", header: "Compras", align: "end", render: (group) => count(group.approved) },
  {
    id: "rate",
    header: "Conversión",
    align: "end",
    render: (group) => (group.source === "invited" ? percent(group.approved, group.sent) : "—"),
  },
  { id: "owed", header: "Por pagar", align: "end", render: (group) => usd(group.owedCents) },
  { id: "paid", header: "Pagado", align: "end", render: (group) => usd(group.paidCents) },
  { id: "revenue", header: "Ingresos", align: "end", render: (group) => usd(group.revenueCents) },
];

export function OverviewPage() {
  const overview = useQuery(trpc.lab.overview.queryOptions());
  const data = overview.data;
  const loading = overview.isPending;

  return (
    <>
      <PageHeader title="Resumen" />
      {overview.error ? <InlineMessage message={errorMessage(overview.error)} tone="error" /> : null}
      <div className="ming-grid">
        <OverviewPanel
          title="Embudo"
          loading={loading}
          stats={[
            { id: "sent", label: "Enviados", value: count(data?.funnel.sent ?? 0) },
            { id: "visited", label: "Visitas", value: count(data?.funnel.visited ?? 0) },
            { id: "participants", label: "Verificados", value: count(data?.funnel.participants ?? 0) },
            { id: "referrals", label: "Referidos", value: count(data?.funnel.referrals ?? 0) },
            { id: "purchases", label: "Compras", value: count(data?.funnel.purchases ?? 0) },
          ]}
        />
        <OverviewPanel
          title="Recompensas"
          loading={loading}
          stats={[
            { id: "owed", label: "Por pagar", value: usd(data?.money.owedCents ?? 0) },
            { id: "paid", label: "Pagado", value: usd(data?.money.paidCents ?? 0) },
            { id: "revenue", label: "Ingresos", value: usd(data?.money.revenueCents ?? 0) },
          ]}
        />
      </div>
      <section aria-labelledby="groups-title" className="ming-section">
        <h2 className="ming-section__title" id="groups-title">
          Por recompensa
        </h2>
        <ResourceTable
          ariaLabel="Comparación por grupo de recompensa"
          columns={columns}
          density="compact"
          emptyState="Sin datos."
          getRowId={(group) => `${group.source}:${group.rewardCents}`}
          loading={loading}
          loadingLabel="Cargando grupos…"
          refetching={overview.isRefetching}
          responsive="scroll"
          rows={data?.groups ?? []}
        />
      </section>
    </>
  );
}
