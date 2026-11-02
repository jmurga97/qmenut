import {
  Badge,
  Button,
  Field,
  InlineMessage,
  Input,
  ResourceTable,
  SearchField,
  Select,
  Textarea,
} from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "~/lib/trpc";
import { formText } from "~/shared/form";
import { date, dateTime, toCents, usd } from "~/shared/format";
import { PAYOUT_STATUS, REFERRAL_STATUS } from "~/shared/labels";
import { PageHeader, PageState } from "~/shared/page";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Detail = LabOutputs["referrals"]["get"];
type HistoryEntry = Detail["history"][number];

const ACTION_LABELS: Record<string, string> = {
  received: "Recibido",
  in_progress: "Marcado en proceso",
  approved: "Aprobado",
  rejected: "Rechazado",
  notes: "Notas actualizadas",
  paid: "Pago registrado",
};

const historyColumns: ResourceTableColumn<HistoryEntry>[] = [
  { id: "when", header: "Fecha", render: (entry) => dateTime(entry.createdAt), width: "28%" },
  { id: "action", header: "Acción", render: (entry) => ACTION_LABELS[entry.action] ?? entry.action },
  { id: "actor", header: "Por", render: (entry) => (entry.actor === "participant" ? "Participante" : entry.actor) },
];

const TODAY = new Date().toISOString().slice(0, 10);

function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: trpc.lab.pathKey() });
}

function ApproveForm({ detail }: { detail: Detail }) {
  const refresh = useRefresh();
  const [query, setQuery] = useState(detail.referral.restaurantName);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const restaurants = useQuery(trpc.lab.referrals.restaurants.queryOptions({ query }));
  const approve = useMutation(
    trpc.lab.referrals.approve.mutationOptions({
      onSuccess: () => {
        toast.success("Referido aprobado.");
        return refresh();
      },
    }),
  );
  const options = (restaurants.data ?? []).map((restaurant) => ({
    id: restaurant.id,
    label: `${restaurant.name}${restaurant.hasBusiness ? " · Business" : ""}`,
  }));

  return (
    <form
      className="lab-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const paymentCents = toCents(formText(form, "amount"));
        if (!restaurantId || paymentCents === null) {
          toast.error("Elige el restaurante y escribe el monto pagado.");
          return;
        }
        approve.mutate({
          referralId: detail.referral.id,
          restaurantId,
          paymentCents,
          paymentDate: formText(form, "date"),
          paymentReference: formText(form, "reference"),
        });
      }}
    >
      <Field label="Buscar restaurante">
        <SearchField clearLabel="Borrar búsqueda" onClear={() => setQuery("")} onValueChange={setQuery} value={query} />
      </Field>
      <Field label="Restaurante">
        <Select
          onValueChange={setRestaurantId}
          options={options}
          placeholder={options.length > 0 ? "Elige un restaurante" : "Sin coincidencias"}
          value={restaurantId}
        />
      </Field>
      <div className="lab-form-row">
        <Field label="Monto (USD)">
          <Input defaultValue="468" inputMode="decimal" name="amount" pattern="\d+([.,]\d{1,2})?" required />
        </Field>
        <Field label="Fecha del pago">
          <Input defaultValue={TODAY} max={TODAY} name="date" required type="date" />
        </Field>
      </div>
      <Field label="Referencia">
        <Input maxLength={120} minLength={3} name="reference" required />
      </Field>
      <div>
        <Button disabled={approve.isPending} type="submit">
          {approve.isPending ? "Aprobando…" : `Aprobar ${usd(detail.referral.rewardCents)}`}
        </Button>
      </div>
    </form>
  );
}

function RejectForm({ referralId }: { referralId: string }) {
  const refresh = useRefresh();
  const reject = useMutation(trpc.lab.referrals.reject.mutationOptions({ onSuccess: refresh }));

  return (
    <form
      className="lab-form"
      onSubmit={(event) => {
        event.preventDefault();
        reject.mutate({ referralId, reason: formText(event.currentTarget, "reason") });
      }}
    >
      <Field label="Motivo para el participante">
        <Textarea maxLength={300} minLength={3} name="reason" required rows={3} />
      </Field>
      <div>
        <Button disabled={reject.isPending} type="submit" variant="destructive">
          {reject.isPending ? "Rechazando…" : "Rechazar"}
        </Button>
      </div>
    </form>
  );
}

function NotesForm({ detail }: { detail: Detail }) {
  const refresh = useRefresh();
  const save = useMutation(
    trpc.lab.referrals.saveNotes.mutationOptions({
      onSuccess: () => {
        toast.success("Notas guardadas.");
        return refresh();
      },
    }),
  );

  return (
    <form
      className="lab-form"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({
          referralId: detail.referral.id,
          notes: formText(event.currentTarget, "notes"),
        });
      }}
    >
      <Field label="Notas internas">
        <Textarea defaultValue={detail.referral.notes ?? ""} maxLength={2000} name="notes" rows={4} />
      </Field>
      <div>
        <Button disabled={save.isPending} type="submit" variant="secondary">
          {save.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function Duplicates({ detail }: { detail: Detail }) {
  return (
    <section aria-labelledby="duplicates-title" className="ming-section">
      <h2 className="ming-section__title" id="duplicates-title">
        Duplicados
      </h2>
      <InlineMessage
        message={
          detail.isFirstIntroduction
            ? "Esta es la primera presentación: tiene prioridad."
            : "Hay una presentación anterior. Resuelve cuál es válida antes de aprobar."
        }
        tone="warning"
      />
      <ul className="ming-stack ming-stack--tight">
        {detail.duplicates.map((duplicate) => (
          <li key={duplicate.id}>
            <Link params={{ referralId: duplicate.id }} to="/referrals/$referralId">
              {duplicate.restaurantName}
            </Link>{" "}
            {`· ${duplicate.participantEmail} · ${date(duplicate.createdAt)} · ${REFERRAL_STATUS[duplicate.status].label}`}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReferralPage({ referralId }: { referralId: string }) {
  const detail = useQuery(trpc.lab.referrals.get.queryOptions({ referralId }));
  const refresh = useRefresh();
  const markInProgress = useMutation(trpc.lab.referrals.markInProgress.mutationOptions({ onSuccess: refresh }));

  if (!detail.data) return <PageState error={detail.error} onRetry={() => void detail.refetch()} />;

  const { referral, participant } = detail.data;
  const open = referral.status === "received" || referral.status === "in_progress";

  return (
    <>
      <PageHeader
        actions={
          referral.status === "received" ? (
            <Button
              disabled={markInProgress.isPending}
              onClick={() => markInProgress.mutate({ referralId })}
              variant="secondary"
            >
              Marcar en proceso
            </Button>
          ) : null
        }
        status={
          <>
            <Badge tone={REFERRAL_STATUS[referral.status].tone}>{REFERRAL_STATUS[referral.status].label}</Badge>
            {referral.status === "approved" ? (
              <Badge tone={PAYOUT_STATUS[referral.payoutStatus].tone}>
                {PAYOUT_STATUS[referral.payoutStatus].label}
              </Badge>
            ) : null}
          </>
        }
        title={referral.restaurantName}
      />
      <div className="ming-split">
        <section aria-labelledby="restaurant-title" className="ming-section">
          <h2 className="ming-section__title" id="restaurant-title">
            Restaurante
          </h2>
          <dl className="ming-data">
            <dt>Contacto</dt>
            <dd>{referral.contactName}</dd>
            <dt>Teléfono</dt>
            <dd>
              <a href={`tel:${referral.contactPhone}`}>{referral.contactPhone}</a>
            </dd>
            <dt>Correo</dt>
            <dd>{referral.contactEmail ?? "—"}</dd>
            <dt>Ciudad</dt>
            <dd>{referral.city ?? "—"}</dd>
            <dt>Web</dt>
            <dd>{referral.website ?? "—"}</dd>
            <dt>Recibido</dt>
            <dd>{dateTime(referral.createdAt)}</dd>
          </dl>
        </section>
        <section aria-labelledby="participant-title" className="ming-section">
          <h2 className="ming-section__title" id="participant-title">
            Presentado por
          </h2>
          <dl className="ming-data">
            <dt>Nombre</dt>
            <dd>{participant.name}</dd>
            <dt>Correo</dt>
            <dd>{participant.email}</dd>
            <dt>Celular</dt>
            <dd>{participant.phone}</dd>
            <dt>Recompensa</dt>
            <dd>{`${usd(referral.rewardCents)} · ${participant.recipientId ? "invitación" : "registro público"}`}</dd>
          </dl>
        </section>
      </div>
      {detail.data.duplicates.length > 0 ? <Duplicates detail={detail.data} /> : null}
      {referral.status === "approved" ? (
        <section aria-labelledby="payment-title" className="ming-section">
          <h2 className="ming-section__title" id="payment-title">
            Compra calificada
          </h2>
          <dl className="ming-data">
            <dt>Restaurante</dt>
            <dd>{detail.data.linkedRestaurantName ?? "—"}</dd>
            <dt>Monto</dt>
            <dd>{usd(referral.paymentCents ?? 0)}</dd>
            <dt>Fecha</dt>
            <dd>{referral.paymentDate ?? "—"}</dd>
            <dt>Referencia</dt>
            <dd>{referral.paymentReference ?? "—"}</dd>
          </dl>
        </section>
      ) : null}
      {referral.status === "rejected" ? (
        <InlineMessage message={referral.rejectionReason ?? ""} title="Motivo del rechazo" tone="error" />
      ) : null}
      {open ? (
        <div className="ming-split">
          <section aria-labelledby="approve-title" className="ming-section">
            <h2 className="ming-section__title" id="approve-title">
              Aprobar
            </h2>
            <ApproveForm detail={detail.data} />
          </section>
          <section aria-labelledby="reject-title" className="ming-section">
            <h2 className="ming-section__title" id="reject-title">
              Rechazar
            </h2>
            <RejectForm referralId={referralId} />
          </section>
        </div>
      ) : null}
      <section aria-labelledby="notes-title" className="ming-section">
        <h2 className="ming-section__title" id="notes-title">
          Notas
        </h2>
        <NotesForm detail={detail.data} key={detail.data.referral.notes ?? ""} />
      </section>
      <section aria-labelledby="history-title" className="ming-section">
        <h2 className="ming-section__title" id="history-title">
          Historial
        </h2>
        <ResourceTable
          ariaLabel="Historial del referido"
          columns={historyColumns}
          density="compact"
          getRowId={(entry) => entry.id}
          responsive="stacked"
          rows={detail.data.history}
        />
      </section>
    </>
  );
}
