import { Badge, Button, Field, Input, ResourceTable, Select } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "~/lib/trpc";
import { formText } from "~/shared/form";
import { date } from "~/shared/format";
import { PageHeader } from "~/shared/page";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Row = LabOutputs["subscriptions"]["list"]["rows"][number];
type Tone = "neutral" | "info" | "success" | "warning" | "error";

const DAY_MS = 86_400_000;
const ALL = "all";

function state(row: Row): { label: string; tone: Tone } {
  if (!row.isActive) return { label: "Apagado", tone: "error" };
  if (row.status === "canceled") return { label: "Cancelado", tone: "neutral" };
  if (row.status === "past_due") return { label: "Pago pendiente", tone: "warning" };
  if (row.hasStripe) return { label: row.status === "trialing" ? "Prueba Stripe" : "Stripe", tone: "success" };
  if (row.status === "trialing") return { label: row.endsAt ? "Demo" : "Prueba ops", tone: "info" };
  return { label: "Pago directo", tone: "success" };
}

function daysLeft(row: Row): string {
  if (!row.endsAt || row.hasStripe) return "—";
  const days = Math.ceil((row.endsAt - Date.now()) / DAY_MS);
  return days >= 0 ? `${days} d` : "vencido";
}

const FILTERS: Record<string, { label: string; match: (row: Row) => boolean }> = {
  [ALL]: { label: "Todos", match: () => true },
  demo: { label: "Demos", match: (row) => !row.hasStripe && row.status === "trialing" && row.endsAt !== null },
  off: { label: "Apagados", match: (row) => !row.isActive },
  paying: { label: "Pagando", match: (row) => row.status === "active" },
};

const columns: ResourceTableColumn<Row>[] = [
  {
    id: "restaurant",
    header: "Restaurante",
    render: (row) => (
      <div className="lab-identity">
        <strong>{row.restaurantName}</strong>
        {row.host ? (
          <a href={`https://${row.host}`} rel="noreferrer" target="_blank">
            {row.host}
          </a>
        ) : null}
      </div>
    ),
  },
  {
    id: "owner",
    header: "Dueño",
    render: (row) => (
      <div className="lab-identity">
        <span>{row.ownerName ?? "—"}</span>
        <span>{row.ownerEmail ?? "—"}</span>
        {row.ownerPhone ? <a href={`https://wa.me/${row.ownerPhone.slice(1)}`}>{row.ownerPhone}</a> : null}
      </div>
    ),
  },
  { id: "country", header: "País", render: (row) => (row.countryCode === "VEN" ? "VE" : "ES") },
  {
    id: "plan",
    header: "Plan",
    render: (row) => `${row.planCode === "business" ? "Business" : "Basic"}${row.founder ? " · founder" : ""}`,
  },
  {
    id: "state",
    header: "Estado",
    render: (row) => {
      const { label, tone } = state(row);
      return <Badge tone={tone}>{label}</Badge>;
    },
  },
  { id: "ends", header: "Fin", align: "end", render: (row) => date(row.endsAt) },
  { id: "left", header: "Quedan", align: "end", render: daysLeft },
  { id: "created", header: "Alta", align: "end", render: (row) => date(row.createdAt) },
];

function inDays(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

function ActivateForm({ row, founderSlotsLeft, onDone }: { row: Row; founderSlotsLeft: number; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [planCode, setPlanCode] = useState<"basic" | "business">("business");
  const [status, setStatus] = useState<"active" | "trialing">("active");
  const activate = useMutation(
    trpc.lab.subscriptions.activate.mutationOptions({
      onSuccess: async () => {
        toast.success(`${row.restaurantName}: plan guardado y menú publicado.`);
        await queryClient.invalidateQueries({ queryKey: trpc.lab.subscriptions.pathKey() });
        onDone();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const canBeFounder = row.founder || founderSlotsLeft > 0;

  return (
    <form
      className="lab-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        activate.mutate({
          restaurantId: row.restaurantId,
          branchId: row.branchId,
          planCode,
          status,
          endsAt: formText(form, "endsAt"),
          founder: new FormData(form).get("founder") === "on",
        });
      }}
    >
      <h3>{`${row.restaurantName} · pago directo o demo más larga`}</h3>
      <div className="lab-form-row">
        <Field label="Plan">
          <Select
            ariaLabel="Plan"
            onValueChange={(value) => setPlanCode(value === "basic" ? "basic" : "business")}
            options={[
              { id: "business", label: "Business" },
              { id: "basic", label: "Basic" },
            ]}
            value={planCode}
          />
        </Field>
        <Field label="Tipo">
          <Select
            ariaLabel="Tipo"
            onValueChange={(value) => setStatus(value === "trialing" ? "trialing" : "active")}
            options={[
              { id: "active", label: "Pagado" },
              { id: "trialing", label: "Demo" },
            ]}
            value={status}
          />
        </Field>
        <Field label="Hasta">
          <Input
            defaultValue={inDays(status === "active" ? 365 : 14)}
            min={inDays(1)}
            name="endsAt"
            required
            type="date"
          />
        </Field>
      </div>
      {planCode === "business" && status === "active" ? (
        <label className="ming-cluster">
          <input defaultChecked={canBeFounder} disabled={!canBeFounder} name="founder" type="checkbox" />
          {canBeFounder ? `Founder (quedan ${founderSlotsLeft} plazas)` : "Sin plazas founder"}
        </label>
      ) : null}
      <div className="ming-cluster">
        <Button disabled={activate.isPending} type="submit">
          {activate.isPending ? "Guardando…" : "Guardar y publicar"}
        </Button>
        <Button onClick={onDone} variant="ghost">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function CheckoutLinkButton({ row }: { row: Row }) {
  const link = useMutation(
    trpc.lab.subscriptions.checkoutLink.mutationOptions({
      onSuccess: async ({ url }) => {
        await navigator.clipboard.writeText(url);
        toast.success("Link de pago copiado. Envíaselo por WhatsApp.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  return (
    <Button
      disabled={link.isPending}
      onClick={() => link.mutate({ restaurantId: row.restaurantId, branchId: row.branchId, planCode: "business" })}
      size="sm"
      variant="ghost"
    >
      Link Stripe
    </Button>
  );
}

export function SubscriptionsPage() {
  const list = useQuery(trpc.lab.subscriptions.list.queryOptions());
  const [filter, setFilter] = useState(ALL);
  const [editing, setEditing] = useState<Row | null>(null);
  const rows = (list.data?.rows ?? []).filter((row) => (FILTERS[filter] ?? FILTERS[ALL]).match(row));
  const demos = (list.data?.rows ?? []).filter((row) => FILTERS.demo?.match(row)).length;

  return (
    <>
      <PageHeader
        title="Restaurantes"
        status={
          list.data ? (
            <span>{`${demos} demos activas · ${list.data.founderSlotsLeft} de 100 plazas founder libres`}</span>
          ) : null
        }
      />
      <section className="ming-section">
        <div className="ming-toolbar">
          <Select
            ariaLabel="Filtro"
            onValueChange={(value) => setFilter(value ?? ALL)}
            options={Object.entries(FILTERS).map(([id, { label }]) => ({ id, label }))}
            value={filter}
          />
        </div>
        <ResourceTable
          actionsLabel="Acciones"
          ariaLabel="Restaurantes y sus planes"
          columns={columns}
          density="compact"
          emptyState="Sin restaurantes."
          error={list.error ? "No se pudieron cargar los restaurantes." : undefined}
          getRowId={(row) => row.branchId}
          loading={list.isPending}
          loadingLabel="Cargando restaurantes…"
          renderRowActions={(row) => (
            <div className="ming-cluster">
              <Button onClick={() => setEditing(row)} size="sm" variant="secondary">
                Activar
              </Button>
              {row.countryCode === "VEN" ? null : <CheckoutLinkButton row={row} />}
            </div>
          )}
          responsive="stacked"
          rows={rows}
        />
        {editing ? (
          <ActivateForm
            founderSlotsLeft={list.data?.founderSlotsLeft ?? 0}
            key={editing.branchId}
            onDone={() => setEditing(null)}
            row={editing}
          />
        ) : null}
      </section>
    </>
  );
}
