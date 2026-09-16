import { Button } from "@jmurga97/components";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { trpc } from "~/lib/trpc";
import { getThemeQueryOptions } from "~/shared/api";

import { QrDownloadForm } from "./qr-download-form";
import { QrPrintablePanel } from "./qr-printable-panel";
import { useQrController } from "../hooks/use-qr-controller";

import type { ReactNode } from "react";

export function QrPanel({ branchId, host }: { branchId: string; host: string }) {
  const { data: branch } = useSuspenseQuery(trpc.admin.branches.get.queryOptions({ branchId }));
  const themeQuery = useQuery({
    ...getThemeQueryOptions({ branchId, trpc }),
    retry: false,
  });
  const controller = useQrController({ domain: host, googlePlaceId: branch.googlePlaceId });
  const [showPrintStyles, setShowPrintStyles] = useState(false);

  const target = controller.target;
  const theme = themeQuery.data ? resolveTenantThemeConfig(themeQuery.data) : null;

  return (
    <div className="admin-page">
      {themeQuery.isPending ? <QrThemeState text="Cargando el tema de la sucursal…" /> : null}
      {themeQuery.isError ? (
        <QrThemeState text="No se pudo cargar el tema de esta sucursal.">
          <Button onClick={() => void themeQuery.refetch()} variant="secondary">
            Reintentar
          </Button>
        </QrThemeState>
      ) : null}
      <QrDownloadForm
        controller={controller}
        googlePlaceId={branch.googlePlaceId}
        showPrintStyles={showPrintStyles}
        onTogglePrintStyles={() => setShowPrintStyles((visible) => !visible)}
      />

      {theme && showPrintStyles ? (
        <QrPrintablePanel branch={branch} target={target} theme={theme} url={controller.url} />
      ) : null}
    </div>
  );
}

function QrThemeState({ children, text }: { children?: ReactNode; text: string }) {
  return (
    <section className="admin-card admin-qr-theme-state" role="status">
      <p>{text}</p>
      {children}
    </section>
  );
}
