import { Badge } from "@jmurga97/components";

import { count, scheduleDate, usd } from "~/shared/format";
import { BATCH_STATUS } from "~/shared/labels";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { LabOutputs } from "~/lib/trpc";

type Batch = LabOutputs["campaigns"]["get"]["batches"][number];

export const batchColumns: ResourceTableColumn<Batch>[] = [
  { id: "position", header: "Lote", render: (batch) => `Lote ${batch.position}` },
  { id: "scheduled", header: "Programado", render: (batch) => scheduleDate(batch.scheduledAt) },
  { id: "reward", header: "Recompensa", align: "end", render: (batch) => usd(batch.rewardCents) },
  {
    id: "recipients",
    header: "Destinatarios",
    align: "end",
    render: (batch) => count(batch.status === "draft" ? batch.size : batch.recipientCount),
  },
  {
    id: "status",
    header: "Estado",
    render: (batch) => (
      <Badge tone={BATCH_STATUS[batch.status].tone}>
        {batch.status === "draft" && batch.scheduledAt ? "Programado" : BATCH_STATUS[batch.status].label}
      </Badge>
    ),
  },
  {
    id: "progress",
    header: "Subidos a Instantly",
    align: "end",
    render: (batch) => (batch.stats ? `${count(batch.stats.enrolled)} / ${count(batch.recipientCount)}` : "—"),
  },
  { id: "sent", header: "Enviados", align: "end", render: (batch) => count(batch.stats?.sent ?? 0) },
  { id: "registered", header: "Verificados", align: "end", render: (batch) => count(batch.stats?.registered ?? 0) },
  { id: "referrals", header: "Referidos", align: "end", render: (batch) => count(batch.stats?.referrals ?? 0) },
  { id: "approved", header: "Compras", align: "end", render: (batch) => count(batch.stats?.approved ?? 0) },
];
