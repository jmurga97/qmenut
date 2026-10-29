import { Button } from "@jmurga97/components";
import { useState } from "react";

import { useStampRequestQueue } from "~/features/loyalty/hooks/use-stamp-request-queue";
import { formatClockTime, formatHoursLeft, formatRelativeAge } from "~/features/loyalty/services";
import { i18n } from "~/lib/i18n";
import { Skeleton } from "~/shared/components/state/loading-state";

import type { StampRequestQueueState } from "~/features/loyalty/hooks/use-stamp-request-queue";
import type { HandledStampRequest, PendingStampRequest } from "~/features/loyalty/types";

export function StampRequestsPanel({ branchId }: { branchId: string }) {
  const queue = useStampRequestQueue(branchId);
  return (
    <section aria-labelledby={"loyalty-stamp-requests-title"} className={"admin-card loyalty-redemptions"}>
      <div className="admin-toolbar">
        <h2 id={"loyalty-stamp-requests-title"}>
          {i18n.t("loyalty___Solicitudes de sellos ({{count}})", { count: queue.pendingQuery.data?.length ?? 0 })}
        </h2>
      </div>
      <PendingList queue={queue} />
      <HandledList queue={queue} />
    </section>
  );
}

function PendingList({ queue }: { queue: StampRequestQueueState }) {
  const { pendingQuery } = queue;
  if (pendingQuery.isPending)
    return (
      <ul
        aria-busy={"true"}
        aria-label={i18n.t("loyalty___Buscando solicitudes")}
        className={"loyalty-redemption-list"}
      >
        <li className={"loyalty-redemption-row"}>
          <div className={"loyalty-redemption-copy"}>
            <Skeleton width={"55%"} />
            <Skeleton height={"0.75rem"} width={"9rem"} />
          </div>
          <Skeleton height={"2rem"} width={"14rem"} />
        </li>
      </ul>
    );
  if (pendingQuery.isError)
    return (
      <Button onClick={() => void pendingQuery.refetch()} variant={"secondary"}>
        {i18n.t("loyalty___Reintentar lista")}
      </Button>
    );
  if (pendingQuery.data.length === 0)
    return (
      <p className="admin-copy">
        {i18n.t("loyalty___No hay solicitudes esperando. Si nadie responde, se aceptan solas a las 12 h.")}
      </p>
    );
  return (
    <ul className={"loyalty-redemption-list"}>
      {pendingQuery.data.map((request) => (
        <PendingRow key={request.id} queue={queue} request={request} />
      ))}
    </ul>
  );
}

function PendingRow({ queue, request }: { queue: StampRequestQueueState; request: PendingStampRequest }) {
  const [quantity, setQuantity] = useState(request.claimedQuantity);
  return (
    <li className={"loyalty-redemption-row"}>
      <div className={"loyalty-redemption-copy"}>
        <strong>{request.email}</strong>
        <span>
          {formatRelativeAge(request.createdAt, queue.now)} · {formatClockTime(request.createdAt)}
        </span>
        <small>
          {i18n.t("loyalty___Se acepta sola en {{hours}} h", {
            hours: formatHoursLeft(request.autoAcceptAt - queue.now),
          })}
        </small>
      </div>
      <div className={"loyalty-redemption-actions"}>
        <div aria-label={i18n.t("loyalty___Sellos a aceptar")} className={"loyalty-stepper"} role={"group"}>
          <Button
            aria-label={i18n.t("loyalty___Un sello menos")}
            disabled={quantity <= 1}
            onClick={() => setQuantity(quantity - 1)}
            size={"sm"}
            variant={"secondary"}
          >
            −
          </Button>
          <output aria-live={"polite"}>
            {i18n.t("loyalty___{{quantity}} de {{claimed}}", { quantity, claimed: request.claimedQuantity })}
          </output>
          <Button
            aria-label={i18n.t("loyalty___Un sello más")}
            disabled={quantity >= request.claimedQuantity}
            onClick={() => setQuantity(quantity + 1)}
            size={"sm"}
            variant={"secondary"}
          >
            +
          </Button>
        </div>
        <Button
          aria-label={i18n.t("loyalty___Aceptar la solicitud de {{email}}", { email: request.email })}
          disabled={queue.actionBusy}
          onClick={() => queue.accept(request, quantity)}
          variant={"primary"}
        >
          {i18n.t("loyalty___Aceptar")}
        </Button>
        <Button
          aria-label={i18n.t("loyalty___Rechazar la solicitud de {{email}}", { email: request.email })}
          disabled={queue.actionBusy}
          onClick={() => queue.decline(request)}
          variant={"secondary"}
        >
          {i18n.t("loyalty___Rechazar")}
        </Button>
      </div>
    </li>
  );
}

function outcomeLabel(request: HandledStampRequest): string {
  if (request.status === "declined") return i18n.t("loyalty___Rechazada");
  if (request.autoAccepted) return i18n.t("loyalty___Aceptada sola");
  if (request.acceptedQuantity !== request.claimedQuantity)
    return i18n.t("loyalty___Aceptada {{accepted}} de {{claimed}}", {
      accepted: request.acceptedQuantity,
      claimed: request.claimedQuantity,
    });
  return i18n.t("loyalty___Aceptada");
}

function HandledList({ queue }: { queue: StampRequestQueueState }) {
  const rows = queue.handledQuery.data ?? [];
  if (rows.length === 0) return null;
  return (
    <details className={"loyalty-handled"}>
      <summary>{i18n.t("loyalty___Últimas 24 h ({{count}})", { count: rows.length })}</summary>
      <ul className={"loyalty-redemption-list"}>
        {rows.map((request) => (
          <li className={"loyalty-redemption-row"} key={request.id}>
            <div className={"loyalty-redemption-copy"}>
              <strong>{outcomeLabel(request)}</strong>
              <span>{request.email}</span>
              <small>
                {i18n.t("loyalty___{{count}} sellos pedidos a las {{time}}", {
                  count: request.claimedQuantity,
                  time: formatClockTime(request.createdAt),
                })}
                {request.handledByName ? ` · ${request.handledByName}` : ""}
              </small>
            </div>
            {request.canUndo ? (
              <div className={"loyalty-redemption-actions"}>
                <Button
                  aria-label={i18n.t("loyalty___Deshacer la solicitud de {{email}}", { email: request.email })}
                  disabled={queue.actionBusy}
                  onClick={() => queue.undo(request.id)}
                  variant={"secondary"}
                >
                  {i18n.t("loyalty___Deshacer")}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
