import { useRedemptionQueue } from "~/features/loyalty/hooks/use-redemption-queue";

import { PendingRedemptionList } from "./pending-redemption-list";

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
        <PendingRedemptionList queue={queue} />
      </section>
    </>
  );
}
