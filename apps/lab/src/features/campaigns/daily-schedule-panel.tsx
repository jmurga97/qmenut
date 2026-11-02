import { Badge, Button, InlineMessage, OverviewPanel, ResourceTable } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { errorMessage } from "~/lib/query-client";
import { trpc } from "~/lib/trpc";
import { count, scheduleDate, usd } from "~/shared/format";
import { PageHeader, PageState } from "~/shared/page";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Schedule = LabOutputs["schedule"]["get"];

function ScheduleDates({ data }: { data: Schedule }) {
  return (
    <p className="ming-section__description">
      {data.eligible > 0 || data.campaign ? (
        <>
          Del {scheduleDate(data.firstAt)} al {scheduleDate(data.lastAt)}.{" "}
        </>
      ) : null}
      <Link to="/leads">Importar o revisar contactos</Link>
    </p>
  );
}

function scheduledStatus(status: string): string {
  if (status === "preview") return "Por programar";
  return status === "paused" ? "En pausa" : "Programado";
}

interface ScheduledRow {
  id: string;
  position: number;
  size: number;
  scheduledAt: number | null;
  status: string;
}
const columns: ResourceTableColumn<ScheduledRow>[] = [
  { id: "date", header: "Fecha", render: (row) => scheduleDate(row.scheduledAt) },
  { id: "time", header: "Hora de Venezuela", render: () => "09:00" },
  { id: "size", header: "Correos", align: "end", render: (row) => count(row.size) },
  {
    id: "status",
    header: "Estado",
    render: (row) => (
      <Badge tone={row.status === "paused" ? "warning" : "neutral"}>{scheduledStatus(row.status)}</Badge>
    ),
  },
];

function UpcomingSends({ data, refetching }: { data: Schedule; refetching: boolean }) {
  const navigate = useNavigate();
  const rows: ScheduledRow[] = data.campaign
    ? data.upcoming
    : Array.from({ length: Math.min(7, data.batches) }, (_, index) => ({
        id: `preview-${index}`,
        position: index + 1,
        scheduledAt: data.firstAt + index * 86_400_000,
        size: Math.min(data.dailyLimit, data.eligible - index * data.dailyLimit),
        status: "preview",
      }));
  return (
    <section className="ming-section" aria-labelledby="upcoming-title">
      <div>
        <h2 className="ming-section__title" id="upcoming-title">
          Próximos envíos
        </h2>
        <p className="ming-section__description">
          {data.campaign
            ? "Próximos 7 grupos del calendario automático."
            : "Así quedarán las primeras fechas al programar la lista."}
        </p>
      </div>
      <ResourceTable
        ariaLabel="Próximos envíos diarios"
        columns={columns}
        rows={rows}
        density="compact"
        responsive="stacked"
        getRowId={(row) => row.id}
        refetching={refetching}
        emptyState="No quedan grupos pendientes. Importa una lista para programar nuevos envíos."
        onRowActivate={
          data.campaign ? (row) => void navigate({ to: "/batches/$batchId", params: { batchId: row.id } }) : undefined
        }
      />
      <p className="ming-section__description">
        Las bajas, rebotes y personas ya inscritas se excluyen antes de cada envío.
      </p>
    </section>
  );
}

export function DailySchedulePanel() {
  const queryClient = useQueryClient();
  const schedule = useQuery({ ...trpc.lab.schedule.get.queryOptions(), refetchInterval: 30_000 });
  const me = useQuery(trpc.lab.me.queryOptions());
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.lab.pathKey() });
  const start = useMutation(
    trpc.lab.schedule.start.mutationOptions({
      onSuccess: async () => {
        toast.success("Envíos diarios programados.");
        await refresh();
      },
    }),
  );
  const pause = useMutation(trpc.lab.schedule.setPaused.mutationOptions({ onSuccess: refresh }));
  if (!schedule.data) return <PageState error={schedule.error} onRetry={() => void schedule.refetch()} />;
  const data = schedule.data;
  const isPaused = data.paused > 0;
  const pauseLabel = isPaused ? "Reanudar programación" : "Pausar programación";

  return (
    <>
      <PageHeader
        eyebrow="Programa de referidos"
        title="Envíos diarios"
        description="150 correos cada día, a las 09:00 de Venezuela, hasta terminar la lista."
        actions={
          data.campaign ? (
            <Button
              disabled={pause.isPending || data.planned === 0}
              onClick={() => pause.mutate({ paused: !isPaused })}
              variant={isPaused ? "primary" : "secondary"}
            >
              {pause.isPending ? "Actualizando…" : pauseLabel}
            </Button>
          ) : (
            <Button disabled={start.isPending || data.eligible === 0} onClick={() => start.mutate()}>
              {start.isPending ? "Programando…" : "Programar todos los envíos"}
            </Button>
          )
        }
      />
      <OverviewPanel
        title={data.source ? `Lista · ${data.source}` : "Lista de contactos"}
        description={`Recompensa de ${usd(data.rewardCents)} por restaurante que contrate el plan anual. Incluye sábados y domingos.`}
        stats={[
          { id: "total", label: "Contactos en la lista", value: count(data.total) },
          {
            id: "pending",
            label: data.campaign ? "Por enviar" : "Sin invitar",
            value: count(data.campaign ? data.planned : data.eligible),
          },
          { id: "daily", label: "Correos por día", value: count(data.dailyLimit) },
          { id: "days", label: "Grupos diarios", value: count(data.batches) },
        ]}
      />
      <ScheduleDates data={data} />
      {me.data?.delivery === "simulate" ? (
        <InlineMessage
          tone="info"
          title="Modo local: sin envíos reales"
          message="Puedes preparar y probar el calendario. Los grupos se simulan; no se enviarán correos a esta lista."
        />
      ) : null}
      {isPaused ? (
        <InlineMessage
          tone="warning"
          message="La programación está pausada. Los grupos que ya comenzaron conservan su estado."
        />
      ) : null}
      {start.error || pause.error ? (
        <InlineMessage tone="error" message={errorMessage(start.error ?? pause.error)} />
      ) : null}
      <UpcomingSends data={data} refetching={schedule.isRefetching} />
    </>
  );
}
