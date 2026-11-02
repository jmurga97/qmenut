import { Badge, Button, ConfirmAction, ResourceTable, SearchField, Select } from "@jmurga97/components";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { trpc } from "~/lib/trpc";
import { count, date, usd } from "~/shared/format";
import { PageHeader } from "~/shared/page";

import { ImportPanel } from "./import-panel";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Lead = LabOutputs["leads"]["list"]["rows"][number];
type Engagement = "not_invited" | "invited" | "sent" | "clicked" | "visited" | "replied" | "registered";
type LeadStatus = Lead["status"];

const ENGAGEMENT_LABELS: Record<Engagement, string> = {
  not_invited: "Sin invitar",
  invited: "Asignado",
  sent: "Enviado",
  clicked: "Clic en el correo",
  visited: "Visitó la oferta",
  replied: "Respondió",
  registered: "Registrado",
};

const STATUS_LABELS: Record<LeadStatus, { label: string; tone: "neutral" | "warning" | "error" }> = {
  active: { label: "Activo", tone: "neutral" },
  unsubscribed: { label: "Dado de baja", tone: "warning" },
  bounced: { label: "Rebotado", tone: "error" },
};

function engagementOf(lead: Lead): Engagement {
  if (lead.participantId) return "registered";
  if (lead.repliedAt) return "replied";
  if (lead.firstVisitAt) return "visited";
  if (lead.clickedAt) return "clicked";
  if (lead.sentAt) return "sent";
  return lead.campaignName ? "invited" : "not_invited";
}

const ALL = "all";

export function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState<string>(ALL);
  const [engagement, setEngagement] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const [unsubscribing, setUnsubscribing] = useState<Lead | null>(null);

  const campaigns = useQuery(trpc.lab.campaigns.list.queryOptions());
  const leads = useQuery({
    ...trpc.lab.leads.list.queryOptions({
      search,
      page,
      batchId: batchId === ALL ? null : batchId,
      engagement: engagement === ALL ? null : (engagement as Engagement),
      status: status === ALL ? null : (status as LeadStatus),
    }),
    placeholderData: keepPreviousData,
  });
  const unsubscribe = useMutation(
    trpc.lab.leads.unsubscribe.mutationOptions({
      onSuccess: () => {
        setUnsubscribing(null);
        return queryClient.invalidateQueries({ queryKey: trpc.lab.leads.list.pathKey() });
      },
    }),
  );

  const filter =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
    };
  const batchOptions = (campaigns.data ?? []).flatMap((campaign) =>
    campaign.batches.map((batch) => ({ id: batch.id, label: `${campaign.name} · lote ${batch.position}` })),
  );
  const total = leads.data?.total ?? 0;
  const pageSize = leads.data?.pageSize ?? 50;

  const columns: ResourceTableColumn<Lead>[] = [
    {
      id: "contact",
      header: "Contacto",
      render: (lead) => (
        <div className="lab-identity">
          <strong>{lead.email}</strong>
          {lead.name ? <span>{lead.name}</span> : null}
        </div>
      ),
      width: "32%",
    },
    {
      id: "batch",
      header: "Lote",
      render: (lead) =>
        lead.campaignName ? `${lead.campaignName} · lote ${lead.batchPosition} · ${usd(lead.rewardCents ?? 0)}` : "—",
    },
    { id: "engagement", header: "Interacción", render: (lead) => ENGAGEMENT_LABELS[engagementOf(lead)] },
    {
      id: "status",
      header: "Suscripción",
      render: (lead) => <Badge tone={STATUS_LABELS[lead.status].tone}>{STATUS_LABELS[lead.status].label}</Badge>,
    },
    { id: "import", header: "Importación", render: (lead) => `${lead.importLabel ?? "—"} · ${date(lead.createdAt)}` },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Audiencia"
        title="Contactos"
        description="Cada contacto recibe una sola invitación. Las bajas y los rebotes nunca vuelven a un lote."
      />
      <ImportPanel />
      <section aria-labelledby="leads-title" className="ming-section">
        <h2 className="ming-section__title" id="leads-title">
          {`${count(total)} contactos`}
        </h2>
        <div className="ming-toolbar">
          <SearchField
            aria-label="Buscar por correo o nombre"
            className="ming-toolbar__search"
            clearLabel="Borrar búsqueda"
            onClear={() => filter(setSearch)("")}
            onValueChange={filter(setSearch)}
            placeholder="Buscar por correo o nombre"
            value={search}
          />
          <Select
            ariaLabel="Lote"
            onValueChange={(value) => filter(setBatchId)(value ?? ALL)}
            options={[{ id: ALL, label: "Todos los lotes" }, ...batchOptions]}
            value={batchId}
          />
          <Select
            ariaLabel="Interacción"
            onValueChange={(value) => filter(setEngagement)(value ?? ALL)}
            options={[
              { id: ALL, label: "Toda interacción" },
              ...Object.entries(ENGAGEMENT_LABELS).map(([id, label]) => ({ id, label })),
            ]}
            value={engagement}
          />
          <Select
            ariaLabel="Suscripción"
            onValueChange={(value) => filter(setStatus)(value ?? ALL)}
            options={[
              { id: ALL, label: "Toda suscripción" },
              ...Object.entries(STATUS_LABELS).map(([id, { label }]) => ({ id, label })),
            ]}
            value={status}
          />
        </div>
        <ResourceTable
          actionsLabel="Acciones"
          ariaLabel="Contactos importados"
          columns={columns}
          density="compact"
          emptyState="Ningún contacto coincide. Cambia los filtros o importa un archivo."
          error={leads.error ? "No se pudieron cargar los contactos. Reintenta en unos segundos." : undefined}
          getRowId={(lead) => lead.id}
          loading={leads.isPending}
          loadingLabel="Cargando contactos…"
          refetching={leads.isFetching && !leads.isPending}
          refetchingLabel="Actualizando contactos…"
          renderRowActions={(lead) =>
            lead.status === "active" ? (
              <Button
                aria-label={`Dar de baja a ${lead.email}`}
                onClick={() => setUnsubscribing(lead)}
                size="sm"
                variant="ghost"
              >
                Dar de baja
              </Button>
            ) : null
          }
          responsive="stacked"
          rows={leads.data?.rows ?? []}
        />
        <div className="ming-cluster ming-cluster--between">
          <span>
            {total > 0
              ? `${count(page * pageSize + 1)}–${count(Math.min(total, (page + 1) * pageSize))} de ${count(total)}`
              : ""}
          </span>
          <div className="ming-cluster">
            <Button disabled={page === 0} onClick={() => setPage(page - 1)} size="sm" variant="secondary">
              Anterior
            </Button>
            <Button
              disabled={(page + 1) * pageSize >= total}
              onClick={() => setPage(page + 1)}
              size="sm"
              variant="secondary"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </section>
      <ConfirmAction
        cancelLabel="Cancelar"
        confirmLabel="Dar de baja"
        message={`${unsubscribing?.email ?? ""} no recibirá más invitaciones y se añadirá a la lista de bloqueo de Instantly. No se puede deshacer.`}
        onConfirm={() => unsubscribing && unsubscribe.mutate({ leadId: unsubscribing.id })}
        onOpenChange={(open) => {
          if (!open) setUnsubscribing(null);
        }}
        open={unsubscribing !== null}
        pending={unsubscribe.isPending}
        pendingLabel="Dando de baja…"
        title="Dar de baja"
      />
    </>
  );
}
