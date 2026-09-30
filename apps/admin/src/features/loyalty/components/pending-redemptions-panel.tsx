import { useRedemptionQueue } from "~/features/loyalty/hooks/use-redemption-queue";
import { i18n } from "~/lib/i18n";

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
      <section aria-labelledby={titleId} className={"admin-card loyalty-redemptions"}>
        <div className="admin-toolbar">
          <h2 id={titleId}>
            {i18n.t("loyalty___Canjes pendientes (")}
            {pendingQuery.data?.length ?? 0})
          </h2>
        </div>
        <PendingRedemptionList queue={queue} />
      </section>
    </>
  );
}
