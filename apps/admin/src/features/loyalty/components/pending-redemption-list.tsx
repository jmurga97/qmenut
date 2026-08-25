import { Button, ConfirmAction } from "@ming/components";
import { useRef, useState } from "react";

import { formatRelativeAge } from "~/features/loyalty/services";

import type { RedemptionQueueState } from "~/features/loyalty/hooks/use-redemption-queue";
import type { PendingRedemption } from "~/features/loyalty/types";

export function PendingRedemptionList({ queue }: { queue: RedemptionQueueState }) {
  const rejectTriggerRef = useRef<HTMLButtonElement>(null);
  const [rejecting, setRejecting] = useState<PendingRedemption | null>(null);
  const { pendingQuery } = queue;
  if (pendingQuery.isPending) return <p className="admin-copy">Buscando solicitudes…</p>;
  if (pendingQuery.isError) {
    return (
      <Button onClick={() => void pendingQuery.refetch()} variant="secondary">
        Reintentar lista
      </Button>
    );
  }
  if (pendingQuery.data?.length === 0) {
    return <p className="admin-copy">No hay canjes esperando. Las nuevas solicitudes aparecerán aquí.</p>;
  }
  return (
    <>
      <ul className="loyalty-redemption-list">
        {pendingQuery.data?.map((redemption) => (
          <li className="loyalty-redemption-row" key={redemption.id}>
            <div className="loyalty-redemption-copy">
              <strong>{redemption.rewardName}</strong>
              <span>{redemption.email}</span>
              <small>
                {redemption.cost} sellos · {formatRelativeAge(redemption.createdAt, queue.now)}
              </small>
            </div>
            <div className="loyalty-redemption-actions">
              <Button
                aria-label={`Validar ${redemption.rewardName} para ${redemption.email}`}
                disabled={queue.actionBusy}
                onClick={() => queue.validate(redemption)}
                variant="primary"
              >
                Validar
              </Button>
              <Button
                aria-label={`Rechazar ${redemption.rewardName} para ${redemption.email}`}
                disabled={queue.actionBusy}
                onClick={(event) => {
                  rejectTriggerRef.current = event.currentTarget;
                  setRejecting(redemption);
                }}
                variant="secondary"
              >
                Rechazar
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {rejecting ? (
        <ConfirmAction
          cancelLabel="Cancelar"
          confirmLabel="Rechazar canje"
          message={`Se rechazará “${rejecting.rewardName}” para ${rejecting.email}.`}
          onCancel={() => setRejecting(null)}
          onConfirm={() => {
            queue.reject(rejecting.id);
            setRejecting(null);
          }}
          onOpenChange={(open) => {
            if (!open) setRejecting(null);
          }}
          open
          title="Rechazar solicitud"
          triggerRef={rejectTriggerRef}
        />
      ) : null}
    </>
  );
}
