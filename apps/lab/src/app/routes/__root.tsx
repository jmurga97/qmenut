import { AppShell, SidebarNav, StatusText } from "@jmurga97/components";
import { useQuery } from "@tanstack/react-query";
import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { trpc } from "~/lib/trpc";
import { PageState } from "~/shared/page";

const AREAS = [
  { id: "overview", label: "Resumen", href: "/" },
  { id: "leads", label: "Contactos", href: "/leads" },
  { id: "campaigns", label: "Envíos", href: "/campaigns" },
  { id: "referrals", label: "Referidos", href: "/referrals" },
  { id: "payouts", label: "Pagos", href: "/payouts" },
] as const;

const MOBILE = "(max-width: 56rem)";

function currentArea(pathname: string) {
  // A batch belongs to its campaign.
  const path = pathname.startsWith("/batches") ? "/campaigns" : pathname;
  return AREAS.find((area) => area.href !== "/" && path.startsWith(area.href)) ?? AREAS[0];
}

function LabShell() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const me = useQuery(trpc.lab.me.queryOptions());
  const [open, setOpen] = useState(() => !globalThis.matchMedia(MOBILE).matches);
  const area = currentArea(pathname);

  if (!me.data) {
    return (
      <main className="ming-page ming-page--narrow">
        <div className="ming-empty">
          <h1>QMenut Lab</h1>
          <PageState error={me.error} onRetry={() => void me.refetch()} />
        </div>
      </main>
    );
  }

  return (
    <AppShell
      header={
        <nav aria-label="Ruta">
          <ol className="ming-breadcrumb">
            <li>Lab</li>
            <li aria-current="page">{area.label}</li>
          </ol>
        </nav>
      }
      navigation={
        <SidebarNav
          ariaLabel="Navegación del Lab"
          header={
            <div className="lab-sidebar-identity">
              <p className="ming-eyebrow">QMenut Lab</p>
              <span>{me.data.email}</span>
            </div>
          }
          items={AREAS.map((item) => ({ ...item, current: item.id === area.id }))}
          footer={
            me.data.delivery === "live" ? (
              <StatusText label="Envío real por Instantly" tone="success" />
            ) : (
              <StatusText label="Envío simulado" tone="warning" />
            )
          }
          onNavigate={(id) => {
            const target = AREAS.find((item) => item.id === id);
            if (target) void navigate({ to: target.href });
            if (globalThis.matchMedia(MOBILE).matches) setOpen(false);
          }}
        />
      }
      navigationLabel="Navegación del Lab"
      closeNavigationLabel="Cerrar navegación"
      hideNavigationLabel="Ocultar navegación"
      showNavigationLabel="Mostrar navegación"
      onOpenChange={setOpen}
      open={open}
    >
      <div className="ming-page">
        <Outlet />
      </div>
    </AppShell>
  );
}

export const Route = createRootRoute({ component: LabShell });
