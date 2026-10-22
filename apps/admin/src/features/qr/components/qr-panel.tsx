import { Button } from "@jmurga97/components";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getThemeQueryOptions } from "~/shared/api";

import { QrPrintablePanel } from "./qr-printable-panel";

import type { QrPrintMode } from "../constants";
import type { ReactNode } from "react";

export function QrPanel({ branchId, host, mode }: { branchId: string; host: string; mode: QrPrintMode }) {
  const { data: branch } = useSuspenseQuery(trpc.admin.branches.get.queryOptions({ branchId }));
  const themeQuery = useQuery({
    ...getThemeQueryOptions({ branchId, trpc }),
    retry: false,
  });
  const theme = themeQuery.data ? resolveTenantThemeConfig(themeQuery.data) : null;

  return (
    <div className={"ming-stack ming-stack--loose"}>
      {themeQuery.isError ? (
        <QrThemeState text={i18n.t("qr___No se pudo cargar el tema de esta sucursal.")}>
          <Button onClick={() => void themeQuery.refetch()} variant={"secondary"}>
            {i18n.t("qr___Reintentar")}
          </Button>
        </QrThemeState>
      ) : null}
      <QrPrintablePanel branch={branch} host={host} mode={mode} theme={theme} />
    </div>
  );
}

function QrThemeState({ children, text }: { children?: ReactNode; text: string }) {
  return (
    <section className={"admin-card admin-qr-theme-state"} role={"status"}>
      <p>{text}</p>
      {children}
    </section>
  );
}
