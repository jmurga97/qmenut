import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, InlineMessage, OverviewPanel, ResourceTable, StatusText } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { trpc } from "~/lib/trpc";
import { EMPTY_RESTAURANT, restaurantSchema, usd } from "~/shared/fields";
import { RestaurantFields } from "~/shared/form-fields";

import { PayoutForm } from "./payout-form";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { ReferralOutputs } from "~/lib/trpc";

type Referral = ReferralOutputs["me"]["referrals"][number];

const STATUS: Record<Referral["status"], { label: string; tone: "neutral" | "info" | "success" | "error" }> = {
  received: { label: "Recibido", tone: "neutral" },
  in_progress: { label: "En proceso", tone: "info" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "No calificó", tone: "error" },
};

const columns: ResourceTableColumn<Referral>[] = [
  {
    id: "restaurant",
    header: "Restaurante",
    render: (referral) => (
      <div className="ref-identity">
        <strong>{referral.restaurantName}</strong>
        {referral.rejectionReason ? <span>{referral.rejectionReason}</span> : null}
      </div>
    ),
  },
  {
    id: "status",
    header: "Estado",
    render: (referral) => (
      <span className="ming-cluster">
        <Badge tone={STATUS[referral.status].tone}>{STATUS[referral.status].label}</Badge>
        {referral.status === "approved" ? (
          <Badge tone={referral.payoutStatus === "paid" ? "success" : "warning"}>
            {referral.payoutStatus === "paid" ? "Pagado" : "Por pagar"}
          </Badge>
        ) : null}
      </span>
    ),
  },
  { id: "reward", header: "Recompensa", align: "end", render: (referral) => usd(referral.rewardCents) },
];

const submitSchema = z.object({ restaurant: restaurantSchema });
type SubmitValues = z.input<typeof submitSchema>;

function AddReferral() {
  const queryClient = useQueryClient();
  const form = useForm<SubmitValues, unknown, z.output<typeof submitSchema>>({
    resolver: zodResolver(submitSchema),
    defaultValues: { restaurant: EMPTY_RESTAURANT },
  });
  const submit = useMutation(
    trpc.referrals.submit.mutationOptions({
      onSuccess: () => {
        toast.success("Restaurante registrado. Te avisaremos en esta página cuando avance.");
        form.reset();
        return queryClient.invalidateQueries({ queryKey: trpc.referrals.me.queryKey() });
      },
    }),
  );

  return (
    <FormProvider {...form}>
      <form
        className="ref-form"
        noValidate
        onSubmit={(event) => void form.handleSubmit((values) => submit.mutate(values))(event)}
      >
        <RestaurantFields<SubmitValues> prefix="restaurant." />
        <div>
          <Button disabled={submit.isPending} type="submit">
            {submit.isPending ? "Enviando…" : "Presentar restaurante"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

export function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useQuery({ ...trpc.referrals.me.queryOptions(), retry: false });
  const signOut = useMutation(
    trpc.referrals.signOut.mutationOptions({
      onSuccess: async () => {
        queryClient.clear();
        await navigate({ to: "/" });
      },
    }),
  );

  if (me.error?.data?.code === "UNAUTHORIZED") return <Navigate to="/acceso" />;
  if (!me.data) {
    return me.error ? (
      <InlineMessage message="No pudimos cargar tus referidos. Recarga la página." tone="error" />
    ) : (
      <StatusText label="Cargando tus referidos…" tone="info" />
    );
  }

  const { participant, referrals, totals, canSubmitPayout } = me.data;

  return (
    <>
      <header className="ming-page-header">
        <div className="ming-page-header__title">
          <p className="ming-eyebrow">Mis referidos</p>
          <h1>{`Hola, ${participant.name}`}</h1>
          <p>{`Tu recompensa es de ${usd(participant.rewardCents)} por cada restaurante que contrate QMenut Business anual.`}</p>
        </div>
        <div className="ming-page-header__actions">
          <Button disabled={signOut.isPending} onClick={() => signOut.mutate()} variant="ghost">
            Cerrar sesión
          </Button>
        </div>
      </header>
      <OverviewPanel
        title="Tus recompensas"
        stats={[
          { id: "referrals", label: "Restaurantes presentados", value: String(referrals.length) },
          { id: "approved", label: "Aprobado", value: usd(totals.approvedCents) },
          { id: "paid", label: "Pagado", value: usd(totals.paidCents) },
        ]}
      />
      <section aria-labelledby="referrals-title" className="ming-section">
        <h2 className="ming-section__title" id="referrals-title">
          Restaurantes presentados
        </h2>
        <ResourceTable
          ariaLabel="Restaurantes presentados"
          columns={columns}
          density="compact"
          emptyState="Aún no has presentado restaurantes."
          getRowId={(referral) => referral.id}
          refetching={me.isRefetching}
          responsive="stacked"
          rows={referrals}
        />
      </section>
      <section aria-labelledby="add-title" className="ming-section">
        <h2 className="ming-section__title" id="add-title">
          Presentar otro restaurante
        </h2>
        <AddReferral />
      </section>
      <section aria-labelledby="payout-title" className="ming-section">
        <h2 className="ming-section__title" id="payout-title">
          Datos de Pago Móvil
        </h2>
        {canSubmitPayout ? (
          <PayoutForm payout={participant.payout} />
        ) : (
          <p>Te pediremos tus datos de Pago Móvil cuando aprobemos tu primer referido.</p>
        )}
      </section>
    </>
  );
}
