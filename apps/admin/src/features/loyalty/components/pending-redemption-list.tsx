import { Button, ConfirmAction } from "@jmurga97/components";
import { useRef, useState } from "react";

import { formatRelativeAge } from "~/features/loyalty/services";
import { i18n } from "~/lib/i18n";
import { Skeleton } from "~/shared/components/state/loading-state";

import type { RedemptionQueueState } from "~/features/loyalty/hooks/use-redemption-queue";
import type { PendingRedemption } from "~/features/loyalty/types";

export function PendingRedemptionList({ queue }: { queue: RedemptionQueueState }) {
  const rejectTriggerRef = useRef<HTMLButtonElement>(null);
  const [rejecting, setRejecting] = useState<PendingRedemption | null>(null);
  const { pendingQuery } = queue;
  if (pendingQuery.isPending)
    return (
      <ul
        aria-busy={"true"}
        aria-label={i18n.t("loyalty___Buscando solicitudes")}
        className={"loyalty-redemption-list"}
      >
        {["62%", "48%"].map((width) => (
          <li className={"loyalty-redemption-row"} key={width}>
            <div className={"loyalty-redemption-copy"}>
              <Skeleton width={width} />
              <Skeleton height={"0.75rem"} width={"9rem"} />
            </div>
            <Skeleton height={"2rem"} width={"11rem"} />
          </li>
        ))}
      </ul>
    );
  if (pendingQuery.isError) {
    return (
      <Button onClick={() => void pendingQuery.refetch()} variant={"secondary"}>
        {i18n.t("loyalty___Reintentar lista")}
      </Button>
    );
  }
  if (pendingQuery.data?.length === 0) {
    return (
      <p className="admin-copy">
        {i18n.t("loyalty___No hay canjes esperando. Las nuevas solicitudes aparecerán aquí.")}
      </p>
    );
  }
  return (
    <>
      <ul className={"loyalty-redemption-list"}>
        {pendingQuery.data?.map((redemption) => (
          <li className={"loyalty-redemption-row"} key={redemption.id}>
            <div className={"loyalty-redemption-copy"}>
              <strong>{redemption.rewardName}</strong>
              <span>{redemption.email}</span>
              <small>
                {redemption.cost} {i18n.t("loyalty___sellos ·")} {formatRelativeAge(redemption.createdAt, queue.now)}
              </small>
            </div>
            <div className={"loyalty-redemption-actions"}>
              <Button
                aria-label={i18n.t("loyalty___Validar {{reward}} para {{email}}", {
                  reward: redemption.rewardName,
                  email: redemption.email,
                })}
                disabled={queue.actionBusy}
                onClick={() => queue.validate(redemption)}
                variant={"primary"}
              >
                {i18n.t("loyalty___Validar")}
              </Button>
              <Button
                aria-label={i18n.t("loyalty___Rechazar {{reward}} para {{email}}", {
                  reward: redemption.rewardName,
                  email: redemption.email,
                })}
                disabled={queue.actionBusy}
                onClick={(event) => {
                  rejectTriggerRef.current = event.currentTarget;
                  setRejecting(redemption);
                }}
                variant={"secondary"}
              >
                {i18n.t("loyalty___Rechazar")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {rejecting ? (
        <ConfirmAction
          cancelLabel={i18n.t("loyalty___Cancelar")}
          confirmLabel={i18n.t("loyalty___Rechazar canje")}
          message={i18n.t("loyalty___Se rechazará “{{reward}}” para {{email}}.", {
            reward: rejecting.rewardName,
            email: rejecting.email,
          })}
          onCancel={() => setRejecting(null)}
          onConfirm={() => {
            queue.reject(rejecting.id);
            setRejecting(null);
          }}
          onOpenChange={(open) => {
            if (!open) setRejecting(null);
          }}
          open
          title={i18n.t("loyalty___Rechazar solicitud")}
          triggerRef={rejectTriggerRef}
        />
      ) : null}
    </>
  );
}
