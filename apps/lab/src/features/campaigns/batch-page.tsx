import {
  Badge,
  Button,
  ConfirmAction,
  InlineMessage,
  OverviewPanel,
  ResourceTable,
  StatusText,
} from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "~/lib/query-client";
import { trpc } from "~/lib/trpc";
import { count, dateTime, scheduleDate, usd } from "~/shared/format";
import { BATCH_STATUS } from "~/shared/labels";
import { PageHeader, PageState } from "~/shared/page";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type BatchDetail = LabOutputs["batches"]["get"];
type Failure = BatchDetail["failures"][number];
type HistoryEntry = BatchDetail["history"][number];

const ACTION_LABELS: Record<string, string> = {
  created: "Lote creado",
  test_sent: "Prueba enviada",
  launched: "Lote lanzado: audiencia, recompensa y plantilla congeladas",
  sending: "Subida completa, campaña activa en Instantly",
  simulated: "Envío simulado",
  paused: "Pausado",
  resumed: "Reanudado",
};

function failureReason(failure: Failure): string {
  if (failure.bouncedAt) return "Rebotó";
  if (failure.unsubscribedAt) return "Se dio de baja";
  if (failure.failureReason === "unsubscribed") return "Dado de baja antes del envío";
  if (failure.failureReason === "bounced") return "Rebotado antes del envío";
  return failure.failureReason ?? "Rechazado";
}

const failureColumns: ResourceTableColumn<Failure>[] = [
  { id: "email", header: "Correo", render: (failure) => failure.email },
  { id: "reason", header: "Motivo", render: failureReason },
];

const historyColumns: ResourceTableColumn<HistoryEntry>[] = [
  { id: "when", header: "Fecha", render: (entry) => dateTime(entry.createdAt), width: "28%" },
  { id: "action", header: "Acción", render: (entry) => ACTION_LABELS[entry.action] ?? entry.action },
  { id: "actor", header: "Por", render: (entry) => (entry.actor === "system" ? "Sistema" : entry.actor) },
];

/** The controlled template rendered in a sandboxed frame from a blob URL, never srcdoc or innerHTML. */
function TemplatePreview({ batchId }: { batchId: string }) {
  const preview = useQuery(trpc.lab.batches.preview.queryOptions({ batchId }));
  const html = preview.data?.html;
  const url = useMemo(
    () =>
      html
        ? URL.createObjectURL(
            new Blob(
              [
                /^\s*<!doctype html/i.test(html)
                  ? html
                  : `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:16px">${html}`,
              ],
              {
                type: "text/html",
              },
            ),
          )
        : null,
    [html],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  if (preview.error)
    return <InlineMessage message={errorMessage(preview.error)} title="Sin vista previa" tone="warning" />;
  if (!preview.data || !url) return <StatusText label="Cargando vista previa…" tone="info" />;

  return (
    <div className="ming-stack">
      <p>
        <strong>Asunto:</strong> {preview.data.subject}
      </p>
      <iframe className="lab-preview" sandbox="" src={url} title="Vista previa del correo" />
    </div>
  );
}

function BatchActions({ detail, onLaunch }: { detail: BatchDetail; onLaunch: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const batchId = detail.batch.id;
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.lab.pathKey() });
  const sendTest = useMutation(
    trpc.lab.batches.sendTest.mutationOptions({
      onSuccess: ({ to, simulated }) =>
        toast.success(simulated ? "Prueba simulada: revisa el registro de la API." : `Prueba enviada a ${to}.`),
    }),
  );
  const pause = useMutation(trpc.lab.batches.pause.mutationOptions({ onSuccess: refresh }));
  const resume = useMutation(trpc.lab.batches.resume.mutationOptions({ onSuccess: refresh }));
  const remove = useMutation(
    trpc.lab.batches.remove.mutationOptions({
      onSuccess: async () => {
        await refresh();
        await navigate({ to: "/campaigns/$campaignId", params: { campaignId: detail.batch.campaignId } });
      },
    }),
  );
  const status = detail.batch.status;

  return (
    <>
      <Button disabled={sendTest.isPending} onClick={() => sendTest.mutate({ batchId })} variant="secondary">
        {sendTest.isPending ? "Enviando…" : "Enviar prueba"}
      </Button>
      {status === "draft" && !detail.batch.scheduledAt ? (
        <>
          <Button disabled={remove.isPending} onClick={() => remove.mutate({ batchId })} variant="ghost">
            Eliminar borrador
          </Button>
          <Button onClick={onLaunch}>Lanzar lote</Button>
        </>
      ) : null}
      {status === "preparing" || status === "sending" || (status === "draft" && detail.batch.scheduledAt) ? (
        <Button disabled={pause.isPending} onClick={() => pause.mutate({ batchId })}>
          {pause.isPending ? "Pausando…" : "Pausar"}
        </Button>
      ) : null}
      {status === "paused" ? (
        <Button disabled={resume.isPending} onClick={() => resume.mutate({ batchId })}>
          {resume.isPending ? "Reanudando…" : "Reanudar"}
        </Button>
      ) : null}
    </>
  );
}

export function BatchPage({ batchId }: { batchId: string }) {
  const queryClient = useQueryClient();
  const detail = useQuery({
    ...trpc.lab.batches.get.queryOptions({ batchId }),
    // Preparation runs in the background; follow it until the upload finishes.
    refetchInterval: (query) => (query.state.data?.batch.status === "preparing" ? 5000 : false),
  });
  const [confirmLaunch, setConfirmLaunch] = useState(false);
  const launch = useMutation(
    trpc.lab.batches.launch.mutationOptions({
      onSuccess: ({ recipientCount }) => {
        setConfirmLaunch(false);
        toast.success(`Lote lanzado con ${count(recipientCount)} destinatarios.`);
        return queryClient.invalidateQueries({ queryKey: trpc.lab.pathKey() });
      },
    }),
  );

  if (!detail.data) return <PageState error={detail.error} onRetry={() => void detail.refetch()} />;

  const { batch, campaignName, stats, failures, history, eligibleLeads } = detail.data;
  const draft = batch.status === "draft";
  const audience = draft ? Math.min(batch.size, eligibleLeads ?? 0) : batch.recipientCount;

  return (
    <>
      <PageHeader
        actions={<BatchActions detail={detail.data} onLaunch={() => setConfirmLaunch(true)} />}
        description={
          <Badge tone={BATCH_STATUS[batch.status].tone}>
            {draft && batch.scheduledAt ? "Programado" : BATCH_STATUS[batch.status].label}
          </Badge>
        }
        eyebrow={campaignName}
        title={`Lote ${batch.position}`}
      />
      {batch.lastError ? (
        <InlineMessage
          message={`${batch.lastError} Se reintenta cada minuto mientras el lote esté en preparación.`}
          title="La preparación se detuvo"
          tone="error"
        />
      ) : null}
      <div className="ming-split">
        <section aria-labelledby="offer-title" className="ming-section">
          <h2 className="ming-section__title" id="offer-title">
            {draft ? "Oferta (se congela al lanzar)" : "Oferta congelada"}
          </h2>
          <p className="lab-reward">{usd(batch.rewardCents)}</p>
          <p>
            Por cada restaurante que contrate QMenut Business anual. Cada invitado conserva este monto en todos sus
            referidos, aunque el lote se reintente o se pause.
          </p>
          <dl className="ming-data">
            <dt>Destinatarios</dt>
            <dd>{count(audience)}</dd>
            {batch.scheduledAt ? (
              <>
                <dt>Fecha de envío</dt>
                <dd>{scheduleDate(batch.scheduledAt)} · 09:00 Venezuela</dd>
              </>
            ) : null}
            <dt>Plantilla</dt>
            <dd>{batch.templateVersion ? `referral-invite v${batch.templateVersion}` : "Versión actual al lanzar"}</dd>
            <dt>Lanzado</dt>
            <dd>{batch.launchedAt ? `${dateTime(batch.launchedAt)} · ${batch.launchedBy ?? ""}` : "—"}</dd>
          </dl>
          {draft ? (
            <InlineMessage
              message={`Se tomarán los ${count(audience)} contactos más antiguos sin invitar, activos y no registrados (hay ${count(eligibleLeads ?? 0)} disponibles). El ritmo lo fijan los límites diarios de cada buzón en Instantly.`}
              tone="info"
            />
          ) : null}
        </section>
        <section aria-labelledby="preview-title" className="ming-section">
          <h2 className="ming-section__title" id="preview-title">
            Correo
          </h2>
          <TemplatePreview batchId={batchId} />
        </section>
      </div>
      {stats ? (
        <div className="ming-grid">
          <OverviewPanel
            title="Entrega"
            stats={[
              {
                id: "enrolled",
                label: "Subidos a Instantly",
                value: `${count(stats.enrolled)} / ${count(batch.recipientCount)}`,
              },
              { id: "sent", label: "Enviados", value: count(stats.sent) },
              { id: "clicked", label: "Clics del proveedor", value: count(stats.clicked) },
              { id: "visited", label: "Visitas", value: count(stats.visited) },
              { id: "replied", label: "Respuestas", value: count(stats.replied) },
            ]}
          />
          <OverviewPanel
            title="Resultados"
            stats={[
              { id: "registered", label: "Verificados", value: count(stats.registered) },
              { id: "referrals", label: "Referidos", value: count(stats.referrals) },
              { id: "approved", label: "Compras", value: count(stats.approved) },
              { id: "failed", label: "No entregables", value: count(stats.failed + stats.bounced) },
              { id: "unsubscribed", label: "Bajas", value: count(stats.unsubscribed) },
            ]}
          />
        </div>
      ) : null}
      {draft ? null : (
        <section aria-labelledby="failures-title" className="ming-section">
          <h2 className="ming-section__title" id="failures-title">
            Fallos, rebotes y bajas
          </h2>
          <ResourceTable
            ariaLabel="Destinatarios no entregados"
            columns={failureColumns}
            density="compact"
            emptyState="Sin fallos por ahora."
            getRowId={(failure) => failure.id}
            responsive="stacked"
            rows={failures}
          />
        </section>
      )}
      <section aria-labelledby="history-title" className="ming-section">
        <h2 className="ming-section__title" id="history-title">
          Historial
        </h2>
        <ResourceTable
          ariaLabel="Historial del lote"
          columns={historyColumns}
          density="compact"
          getRowId={(entry) => entry.id}
          responsive="stacked"
          rows={history}
        />
      </section>
      <ConfirmAction
        cancelLabel="Cancelar"
        confirmLabel="Lanzar lote"
        message={`Se congelarán ${count(audience)} destinatarios con una recompensa de ${usd(batch.rewardCents)} y la plantilla actual. No se puede deshacer.`}
        onConfirm={() => launch.mutate({ batchId })}
        onOpenChange={setConfirmLaunch}
        open={confirmLaunch}
        pending={launch.isPending}
        pendingLabel="Lanzando…"
        title={`Lanzar lote ${batch.position}`}
      />
    </>
  );
}
