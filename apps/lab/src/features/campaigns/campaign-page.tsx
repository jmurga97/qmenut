import { Button, Field, InlineMessage, Input, ResourceTable } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { trpc } from "~/lib/trpc";
import { formText } from "~/shared/form";
import { count, toCents } from "~/shared/format";
import { PageHeader, PageState } from "~/shared/page";

import { batchColumns } from "./batch-columns";

export function CampaignPage({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const campaign = useQuery(trpc.lab.campaigns.get.queryOptions({ campaignId }));
  const create = useMutation(
    trpc.lab.batches.create.mutationOptions({
      onSuccess: async ({ id }) => {
        await queryClient.invalidateQueries({ queryKey: trpc.lab.campaigns.pathKey() });
        await navigate({ to: "/batches/$batchId", params: { batchId: id } });
      },
    }),
  );

  if (!campaign.data) return <PageState error={campaign.error} onRetry={() => void campaign.refetch()} />;

  const { assigned, maxRecipients, nextBatch, eligibleLeads, batches } = campaign.data;
  const full = nextBatch.size === 0;

  return (
    <>
      <PageHeader title={campaign.data.campaign.name} />
      <section aria-labelledby="new-batch-title" className="ming-section">
        <h2 className="ming-section__title" id="new-batch-title">
          {`Nuevo lote ${batches.length + 1}`}
        </h2>
        {full ? (
          <InlineMessage message={`Campaña completa: ${count(maxRecipients)} destinatarios.`} tone="info" />
        ) : (
          <form
            className="lab-form"
            // Remount with the next batch's suggestions after each creation.
            key={batches.length}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const rewardCents = toCents(formText(form, "reward"));
              if (rewardCents === null) return;
              create.mutate({ campaignId, size: Number(formText(form, "size")), rewardCents });
            }}
          >
            <div className="lab-form-row">
              <Field label={`Destinatarios · ${count(eligibleLeads)} sin invitar`}>
                <Input
                  defaultValue={nextBatch.size}
                  inputMode="numeric"
                  max={maxRecipients - assigned}
                  min={1}
                  name="size"
                  required
                  type="number"
                />
              </Field>
              <Field label="Recompensa (USD)">
                <Input
                  defaultValue={nextBatch.rewardCents / 100}
                  inputMode="decimal"
                  name="reward"
                  pattern="\d+([.,]\d{1,2})?"
                  required
                />
              </Field>
            </div>
            <div>
              <Button disabled={create.isPending} type="submit">
                {create.isPending ? "Creando…" : "Crear lote"}
              </Button>
            </div>
          </form>
        )}
      </section>
      <section aria-labelledby="batches-title" className="ming-section">
        <h2 className="ming-section__title" id="batches-title">
          Lotes
        </h2>
        <ResourceTable
          ariaLabel="Lotes de la campaña"
          columns={batchColumns}
          density="compact"
          emptyState="Sin lotes."
          getRowId={(batch) => batch.id}
          onRowActivate={(batch) => void navigate({ to: "/batches/$batchId", params: { batchId: batch.id } })}
          refetching={campaign.isRefetching}
          responsive="scroll"
          rows={batches}
        />
      </section>
    </>
  );
}
