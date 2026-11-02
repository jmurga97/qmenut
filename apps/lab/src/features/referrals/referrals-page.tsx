import { Badge, ResourceTable, SearchField, Select } from "@jmurga97/components";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { trpc } from "~/lib/trpc";
import { date, usd } from "~/shared/format";
import { PAYOUT_STATUS, REFERRAL_STATUS } from "~/shared/labels";
import { PageHeader } from "~/shared/page";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Referral = LabOutputs["referrals"]["list"][number];
type Status = Referral["status"];

const ALL = "all";

const columns: ResourceTableColumn<Referral>[] = [
  {
    id: "restaurant",
    header: "Restaurante",
    render: (referral) => (
      <div className="lab-identity">
        <strong>{referral.restaurantName}</strong>
        {referral.city ? <span>{referral.city}</span> : null}
      </div>
    ),
    width: "28%",
  },
  {
    id: "participant",
    header: "Presentado por",
    render: (referral) => (
      <div className="lab-identity">
        <span>{referral.participantName}</span>
        <span>{referral.participantEmail}</span>
      </div>
    ),
  },
  { id: "reward", header: "Recompensa", align: "end", render: (referral) => usd(referral.rewardCents) },
  {
    id: "status",
    header: "Estado",
    render: (referral) => (
      <div className="ming-cluster">
        <Badge tone={REFERRAL_STATUS[referral.status].tone}>{REFERRAL_STATUS[referral.status].label}</Badge>
        {referral.status === "approved" ? (
          <Badge tone={PAYOUT_STATUS[referral.payoutStatus].tone}>{PAYOUT_STATUS[referral.payoutStatus].label}</Badge>
        ) : null}
        {referral.duplicates > 0 ? <Badge tone="warning">Posible duplicado</Badge> : null}
      </div>
    ),
  },
  { id: "received", header: "Recibido", align: "end", render: (referral) => date(referral.createdAt) },
];

export function ReferralsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("received");
  const referrals = useQuery({
    ...trpc.lab.referrals.list.queryOptions({ search, status: status === ALL ? null : (status as Status) }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        eyebrow="Revisión"
        title="Referidos"
        description="Restaurantes presentados por participantes verificados. La primera presentación válida tiene prioridad."
      />
      <section aria-label="Lista de referidos" className="ming-section">
        <div className="ming-toolbar">
          <SearchField
            aria-label="Buscar referidos"
            className="ming-toolbar__search"
            clearLabel="Borrar búsqueda"
            onClear={() => setSearch("")}
            onValueChange={setSearch}
            placeholder="Restaurante, correo o teléfono"
            value={search}
          />
          <Select
            ariaLabel="Estado"
            onValueChange={(value) => setStatus(value ?? ALL)}
            options={[
              { id: ALL, label: "Todos los estados" },
              ...Object.entries(REFERRAL_STATUS).map(([id, { label }]) => ({ id, label })),
            ]}
            value={status}
          />
        </div>
        <ResourceTable
          ariaLabel="Referidos"
          columns={columns}
          emptyState="No hay referidos con estos filtros."
          error={referrals.error ? "No se pudieron cargar los referidos. Reintenta en unos segundos." : undefined}
          getRowId={(referral) => referral.id}
          loading={referrals.isPending}
          loadingLabel="Cargando referidos…"
          onRowActivate={(referral) =>
            void navigate({ to: "/referrals/$referralId", params: { referralId: referral.id } })
          }
          refetching={referrals.isFetching && !referrals.isPending}
          responsive="stacked"
          rows={referrals.data ?? []}
        />
      </section>
    </>
  );
}
