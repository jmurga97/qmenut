import { Button, ResourceTable, SearchField } from "@jmurga97/components";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { trpc } from "~/lib/trpc";
import { count, scheduleDate, usd } from "~/shared/format";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Participant = LabOutputs["participants"]["list"]["rows"][number];
const columns: ResourceTableColumn<Participant>[] = [
  {
    id: "person",
    header: "Participante",
    render: (row) => (
      <div className="lab-identity">
        <strong>{row.name}</strong>
        <span>{row.email}</span>
      </div>
    ),
  },
  { id: "phone", header: "Teléfono", render: (row) => row.phone },
  { id: "reward", header: "Recompensa", align: "end", render: (row) => usd(row.rewardCents) },
  { id: "referrals", header: "Restaurantes referidos", align: "end", render: (row) => count(row.referrals) },
  { id: "joined", header: "Inscrito", render: (row) => scheduleDate(row.joinedAt) },
];

export function ParticipantsList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const participants = useQuery({
    ...trpc.lab.participants.list.queryOptions({ search, page }),
    refetchInterval: 30_000,
  });
  const data = participants.data;
  return (
    <section className="ming-section" aria-labelledby="participants-title">
      <div>
        <h2 className="ming-section__title" id="participants-title">
          Participantes inscritos{data ? ` · ${count(data.total)}` : ""}
        </h2>
        <p className="ming-section__description">
          Personas que completaron el formulario y confirmaron su correo para participar.
        </p>
      </div>
      <div className="ming-toolbar">
        <SearchField
          aria-label="Buscar participantes"
          placeholder="Nombre o correo"
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
        />
      </div>
      <ResourceTable
        ariaLabel="Participantes verificados del programa"
        columns={columns}
        rows={data?.rows ?? []}
        density="compact"
        responsive="stacked"
        getRowId={(row) => row.id}
        loading={participants.isPending}
        refetching={participants.isRefetching}
        loadingLabel="Cargando participantes…"
        error={participants.error ? "No se pudieron cargar los participantes. Vuelve a intentarlo." : undefined}
        emptyState={
          search
            ? "No hay participantes que coincidan con la búsqueda."
            : "Aún no hay participantes verificados. Aparecerán aquí al completar su inscripción."
        }
      />
      {data && data.total > data.pageSize ? (
        <div className="lab-pagination">
          <span>{`${count(page * data.pageSize + 1)}–${count(Math.min((page + 1) * data.pageSize, data.total))} de ${count(data.total)}`}</span>
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={(page + 1) * data.pageSize >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      ) : null}
    </section>
  );
}
