import { Button } from "@jmurga97/components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BellIcon } from "lucide-react";
import { useEffect } from "react";

import * as api from "~/features/notifications/api";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";

export function NotificationBell({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const badgeQuery = useQuery({
    ...api.getNotificationBadgeQueryOptions({ branchId, trpc }),
    refetchInterval: () => (document.visibilityState === "visible" ? api.BADGE_POLL_INTERVAL_MS : false),
    refetchOnWindowFocus: true,
  });
  const count = badgeQuery.data ?? 0;

  // The service worker posts a message on every push, so an open admin refreshes at once.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const refresh = () => void queryClient.invalidateQueries();
    navigator.serviceWorker.addEventListener("message", refresh);
    return () => navigator.serviceWorker.removeEventListener("message", refresh);
  }, [queryClient]);

  // Installed app: mirror the count on the home-screen / dock icon. Unsupported browsers just skip it.
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    void (count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => null);
  }, [count]);

  return (
    <Button
      aria-label={
        count > 0
          ? i18n.t("notifications___Notificaciones, {{count}} sin leer", { count })
          : i18n.t("notifications___Notificaciones")
      }
      className="notification-bell"
      nativeButton={false}
      render={<Link to="/notifications" />}
      size={"sm"}
      variant={"ghost"}
    >
      <BellIcon aria-hidden="true" focusable="false" />
      {count > 0 ? (
        <span aria-hidden="true" className="notification-bell-count">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Button>
  );
}
