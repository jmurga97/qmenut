import { Button } from "@jmurga97/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";

import * as api from "~/features/notifications/api";
import { PushDeviceControl } from "~/features/notifications/components/push-device-control";
import * as services from "~/features/notifications/services";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { PageHeader } from "~/shared/components/page-header";
import { Skeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import type { UseQueryResult } from "@tanstack/react-query";
import type { NotificationRow } from "~/features/notifications/types";

export function NotificationsPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description={i18n.t("notifications___Crea una sucursal para recibir avisos.")} />;
  return <NotificationsInbox branchId={branch.id} branchName={branch.name} key={branch.id} />;
}

function NotificationsInbox({ branchId, branchName }: { branchId: string; branchName: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const listQuery = useQuery({
    ...api.getNotificationsQueryOptions({ branchId, trpc }),
    refetchInterval: () => (document.visibilityState === "visible" ? api.BADGE_POLL_INTERVAL_MS : false),
    refetchOnWindowFocus: true,
  });
  const options = api.getNotificationMutationOptions({ queryClient, trpc });
  const markRead = useMutation(options.markRead);
  const markAllRead = useMutation(options.markAllRead);
  const hasUnread = listQuery.data?.some((row) => row.readAt === null) ?? false;

  function open(row: NotificationRow) {
    if (row.readAt === null) markRead.mutate({ ids: [row.id] });
    const { url } = services.describeNotification(row);
    if (!url) return;
    if (url.startsWith("/")) void navigate({ href: url });
    else window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="ming-page admin-page notifications-page">
      <PageHeader
        actions={
          hasUnread ? (
            <Button
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate({ branchId })}
              variant={"secondary"}
            >
              {i18n.t("notifications___Marcar todo como leído")}
            </Button>
          ) : null
        }
        description={i18n.t("notifications___Lo que necesita tu atención en esta sucursal, de los últimos 30 días.")}
        kicker={branchName}
        title={i18n.t("notifications___Notificaciones")}
      />
      <Suspense fallback={null}>
        <PushDeviceControl selectedBranchId={branchId} />
      </Suspense>
      <NotificationList onOpen={open} query={listQuery} />
    </div>
  );
}

function NotificationList({
  onOpen,
  query,
}: {
  onOpen: (row: NotificationRow) => void;
  query: UseQueryResult<NotificationRow[], unknown>;
}) {
  if (query.isPending) {
    return (
      <ul
        aria-busy={"true"}
        aria-label={i18n.t("notifications___Cargando notificaciones")}
        className="notifications-list"
      >
        {["58%", "44%", "52%"].map((width) => (
          <li className="notifications-row" key={width}>
            <Skeleton width={width} />
          </li>
        ))}
      </ul>
    );
  }
  if (query.isError) {
    return (
      <Button onClick={() => void query.refetch()} variant={"secondary"}>
        {i18n.t("notifications___Reintentar")}
      </Button>
    );
  }
  if (query.data.length === 0) {
    return (
      <p className="admin-copy">
        {i18n.t("notifications___No hay notificaciones. Los avisos nuevos aparecerán aquí.")}
      </p>
    );
  }
  return (
    <ul className="notifications-list">
      {query.data.map((row) => {
        const { title, detail } = services.describeNotification(row);
        const handled = services.describeHandled(row);
        return (
          <li key={row.id}>
            <button
              className="notifications-row"
              data-handled={handled !== null}
              data-unread={row.readAt === null}
              onClick={() => onOpen(row)}
              type="button"
            >
              <span className="notifications-row-copy">
                <strong>{title}</strong>
                {detail ? <span>{detail}</span> : null}
                <small>
                  {services.formatNotificationTime(row.createdAt)}
                  {handled ? ` · ${handled}` : null}
                </small>
              </span>
              {row.readAt === null ? (
                <span className="notifications-unread">{i18n.t("notifications___Sin leer")}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
