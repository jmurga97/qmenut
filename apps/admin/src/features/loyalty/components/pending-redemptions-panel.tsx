import { InlineMessage } from "@jmurga97/components";

import { useRedemptionQueue } from "~/features/loyalty/hooks/use-redemption-queue";

import { PendingRedemptionList } from "./pending-redemption-list";
import { RedemptionToast } from "./redemption-toast";

interface PendingRedemptionsPanelProps {
  branchId: string;
  titleId: string;
}

export function PendingRedemptionsPanel({ branchId, titleId }: PendingRedemptionsPanelProps) {
  const queue = useRedemptionQueue(branchId);
  const { pendingQuery } = queue;
  return (
    <>
      <section aria-labelledby={titleId} className="admin-card loyalty-redemptions">
        <div className="admin-toolbar">
          <h3 id={titleId}>Canjes pendientes ({pendingQuery.data?.length ?? 0})</h3>
          {pendingQuery.isFetching ? <span className="loyalty-live-label">Actualizando</span> : null}
        </div>
        {queue.rowError ? <InlineMessage message={queue.rowError} tone="error" /> : null}
        <PendingRedemptionList queue={queue} />
      </section>
      <RedemptionToast queue={queue} />
    </>
  );
}
