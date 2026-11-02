import { Button, Field, Input, ResourceTable } from "@jmurga97/components";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { trpc } from "~/lib/trpc";
import { formText } from "~/shared/form";
import { count, date } from "~/shared/format";

import { DailySchedulePanel } from "./daily-schedule-panel";
import { ParticipantsList } from "./participants-list";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Campaign = LabOutputs["campaigns"]["list"][number];

const columns: ResourceTableColumn<Campaign>[] = [
  { id: "name", header: "Campaña", render: (campaign) => <strong>{campaign.name}</strong>, width: "36%" },
  { id: "batches", header: "Lotes", align: "end", render: (campaign) => count(campaign.batches.length) },
  {
    id: "recipients",
    header: "Destinatarios",
    align: "end",
    render: (campaign) => count(campaign.batches.reduce((sum, batch) => sum + batch.recipientCount, 0)),
  },
  {
    id: "sent",
    header: "Enviados",
    align: "end",
    render: (campaign) => count(campaign.batches.reduce((sum, batch) => sum + (batch.stats?.sent ?? 0), 0)),
  },
  {
    id: "approved",
    header: "Compras",
    align: "end",
    render: (campaign) => count(campaign.batches.reduce((sum, batch) => sum + (batch.stats?.approved ?? 0), 0)),
  },
  { id: "created", header: "Creada", align: "end", render: (campaign) => date(campaign.createdAt) },
];

export function CampaignsPage() {
  const navigate = useNavigate();
  const campaigns = useQuery(trpc.lab.campaigns.list.queryOptions());
  const create = useMutation(
    trpc.lab.campaigns.create.mutationOptions({
      onSuccess: ({ id }) => navigate({ to: "/campaigns/$campaignId", params: { campaignId: id } }),
    }),
  );

  return (
    <>
      <DailySchedulePanel />
      <ParticipantsList />
      <details className="ming-section">
        <summary>Historial y campañas manuales</summary>
        <section aria-labelledby="new-campaign-title" className="ming-section">
          <h2 className="ming-section__title" id="new-campaign-title">
            Nueva campaña
          </h2>
          <form
            className="lab-form"
            onSubmit={(event) => {
              event.preventDefault();
              const name = formText(event.currentTarget, "name");
              create.mutate({ name });
            }}
          >
            <Field label="Nombre">
              <Input maxLength={80} minLength={2} name="name" placeholder="Referidos Caracas 2026" required />
            </Field>
            <div>
              <Button disabled={create.isPending} type="submit">
                {create.isPending ? "Creando…" : "Crear campaña"}
              </Button>
            </div>
          </form>
        </section>
        <section aria-labelledby="campaigns-title" className="ming-section">
          <h2 className="ming-section__title" id="campaigns-title">
            Campañas
          </h2>
          <ResourceTable
            ariaLabel="Campañas de referidos"
            columns={columns}
            emptyState="Aún no hay campañas. Crea la primera para preparar sus lotes."
            error={campaigns.error ? "No se pudieron cargar las campañas. Reintenta en unos segundos." : undefined}
            getRowId={(campaign) => campaign.id}
            loading={campaigns.isPending}
            loadingLabel="Cargando campañas…"
            onRowActivate={(campaign) =>
              void navigate({ to: "/campaigns/$campaignId", params: { campaignId: campaign.id } })
            }
            refetching={campaigns.isRefetching}
            responsive="stacked"
            rows={campaigns.data ?? []}
          />
        </section>
      </details>
    </>
  );
}
