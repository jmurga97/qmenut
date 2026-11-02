import { Button, Field, InlineMessage, Input, ResourceTable } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "~/lib/trpc";
import { formText } from "~/shared/form";
import { date, toCents, usd, ves } from "~/shared/format";
import { PageHeader } from "~/shared/page";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Payout = LabOutputs["payouts"]["list"]["pending"][number];

function PagoMovil({ payout }: { payout: Payout }) {
  if (!payout.payoutBank) return <span>Sin datos de Pago Móvil</span>;

  return (
    <div className="lab-identity">
      <span>{payout.payoutBank}</span>
      <span>{`${payout.payoutIdNumber ?? ""} · ${payout.payoutPhone ?? ""}`}</span>
    </div>
  );
}

const participant: ResourceTableColumn<Payout> = {
  id: "participant",
  header: "Participante",
  render: (payout) => (
    <div className="lab-identity">
      <strong>{payout.participantName}</strong>
      <span>{payout.participantEmail}</span>
    </div>
  ),
};

const pendingColumns: ResourceTableColumn<Payout>[] = [
  participant,
  { id: "pago-movil", header: "Pago Móvil", render: (payout) => <PagoMovil payout={payout} /> },
  { id: "restaurant", header: "Restaurante", render: (payout) => payout.restaurantName },
  { id: "reward", header: "Recompensa", align: "end", render: (payout) => usd(payout.rewardCents) },
  { id: "approved", header: "Aprobado", align: "end", render: (payout) => date(payout.approvedAt) },
];

const paidColumns: ResourceTableColumn<Payout>[] = [
  participant,
  { id: "restaurant", header: "Restaurante", render: (payout) => payout.restaurantName },
  { id: "reward", header: "USD", align: "end", render: (payout) => usd(payout.rewardCents) },
  { id: "ves", header: "Bs. pagados", align: "end", render: (payout) => ves(payout.payoutVesCents ?? 0) },
  { id: "rate", header: "Tasa", align: "end", render: (payout) => payout.payoutRate ?? "—" },
  { id: "reference", header: "Referencia", render: (payout) => payout.payoutReference ?? "—" },
  { id: "paid", header: "Pagado", align: "end", render: (payout) => date(payout.paidAt) },
];

function PayForm({ payout, onDone }: { payout: Payout; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const markPaid = useMutation(
    trpc.lab.payouts.markPaid.mutationOptions({
      onSuccess: async () => {
        toast.success(`Pago registrado para ${payout.participantName}.`);
        await queryClient.invalidateQueries({ queryKey: trpc.lab.pathKey() });
        onDone();
      },
    }),
  );
  const rateNumber = Number(rate.replace(",", "."));

  return (
    <form
      className="lab-form"
      onSubmit={(event) => {
        event.preventDefault();
        const vesCents = toCents(amount);
        const reference = formText(event.currentTarget, "reference");
        if (vesCents === null) return;
        markPaid.mutate({ referralId: payout.id, vesCents, rate: rate.replace(",", "."), reference });
      }}
    >
      <p>{`Recompensa de ${usd(payout.rewardCents)} para ${payout.participantName} por ${payout.restaurantName}.`}</p>
      {payout.payoutBank ? null : (
        <InlineMessage message="El participante aún no cargó sus datos de Pago Móvil." tone="warning" />
      )}
      <div className="lab-form-row">
        <Field hint="Bolívares por dólar." label="Tasa de cambio">
          <Input
            inputMode="decimal"
            onValueChange={(value) => {
              setRate(value);
              const parsed = Number(value.replace(",", "."));
              // Suggest the bolívar amount; staff can still change it.
              if (parsed > 0) setAmount(((payout.rewardCents / 100) * parsed).toFixed(2));
            }}
            pattern="\d{1,6}([.,]\d{1,6})?"
            required
            value={rate}
          />
        </Field>
        <Field hint={rateNumber > 0 ? `${usd(payout.rewardCents)} × ${rate}` : undefined} label="Monto pagado (Bs.)">
          <Input inputMode="decimal" onValueChange={setAmount} pattern="\d+([.,]\d{1,2})?" required value={amount} />
        </Field>
      </div>
      <Field label="Referencia del Pago Móvil">
        <Input maxLength={120} minLength={3} name="reference" required />
      </Field>
      <div className="ming-cluster">
        <Button disabled={markPaid.isPending} type="submit">
          {markPaid.isPending ? "Registrando…" : "Registrar pago"}
        </Button>
        <Button onClick={onDone} variant="ghost">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function PayoutsPage() {
  const payouts = useQuery(trpc.lab.payouts.list.queryOptions());
  const [paying, setPaying] = useState<Payout | null>(null);
  const error = payouts.error ? "No se pudieron cargar los pagos. Reintenta en unos segundos." : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Recompensas"
        title="Pagos"
        description="Pagos manuales por Pago Móvil. Cada recompensa aprobada se paga una sola vez."
      />
      <section aria-labelledby="pending-title" className="ming-section">
        <h2 className="ming-section__title" id="pending-title">
          Por pagar
        </h2>
        <ResourceTable
          actionsLabel="Acciones"
          ariaLabel="Recompensas aprobadas sin pagar"
          columns={pendingColumns}
          emptyState="No hay recompensas pendientes de pago."
          error={error}
          getRowId={(payout) => payout.id}
          loading={payouts.isPending}
          loadingLabel="Cargando pagos…"
          renderRowActions={(payout) => (
            <Button onClick={() => setPaying(payout)} size="sm" variant="secondary">
              Registrar pago
            </Button>
          )}
          responsive="stacked"
          rows={payouts.data?.pending ?? []}
        />
        {paying ? <PayForm key={paying.id} onDone={() => setPaying(null)} payout={paying} /> : null}
      </section>
      <section aria-labelledby="paid-title" className="ming-section">
        <h2 className="ming-section__title" id="paid-title">
          Historial de pagos
        </h2>
        <ResourceTable
          ariaLabel="Recompensas pagadas"
          columns={paidColumns}
          density="compact"
          emptyState="Aún no hay pagos registrados."
          error={error}
          getRowId={(payout) => payout.id}
          loading={payouts.isPending}
          responsive="stacked"
          rows={payouts.data?.paid ?? []}
        />
      </section>
    </>
  );
}
