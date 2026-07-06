import { McAppShell, McSidebarNav } from "@murga.ing/components/react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";

import { useShellActions, useShellMobile, useSidebarOpen } from "@app/store/shell-store";
import { resolveSelectedBranch, useBranchStore } from "@app/store/branch-store";
import { signOut } from "@lib/auth-client";
import { useThemeStore } from "@lib/theme";
import { trpc } from "@lib/trpc";

const SECTIONS = [
  { id: "overview", label: "Resumen", path: "/" },
  { id: "menu", label: "Menú", path: "/menu" },
  { id: "branch", label: "Sucursal", path: "/branch" },
  { id: "promotions", label: "Promociones", path: "/promotions" },
  { id: "theme", label: "Tema", path: "/theme" },
  { id: "languages", label: "Idiomas", path: "/languages" },
  { id: "billing", label: "Facturación", path: "/billing" },
] as const;

function getCurrentSectionLabel(pathname: string) {
  const section = SECTIONS.find((item) => item.path !== "/" && pathname.startsWith(item.path));
  return section?.label ?? "Resumen";
}

function getNavigationItems(pathname: string) {
  return SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    current: section.path === "/" ? pathname === "/" : pathname.startsWith(section.path),
  }));
}

function getFooterItems() {
  return [
    {
      id: "public-site",
      label: "Ver carta",
      description: "Abrir la carta pública de la sucursal",
    },
    {
      id: "logout",
      label: "Salir",
      description: "Cerrar sesión del panel",
    },
  ];
}

export function AdminShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { data: tenant } = useSuspenseQuery(trpc.admin.tenant.me.queryOptions());
  const isMobile = useShellMobile();
  const isSidebarOpen = useSidebarOpen();
  const { closeSidebar, setSidebarOpen, toggleSidebar } = useShellActions();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const setSelectedBranchId = useBranchStore((state) => state.setSelectedBranchId);
  const selectedBranch = resolveSelectedBranch(tenant.branches, selectedBranchId);
  const sectionLabel = getCurrentSectionLabel(location.pathname);

  return (
    <McAppShell
      mobileOverlay={isMobile}
      onMcSidebarOpenChange={(event) => {
        setSidebarOpen(event.detail.open);
      }}
      sidebarOpen={isSidebarOpen}
    >
      <div slot="sidebar" className="admin-sidebar-slot">
        <McSidebarNav
          ariaLabel="Navegación del panel"
          footerItems={getFooterItems()}
          items={getNavigationItems(location.pathname)}
          onMcSelect={(event) => {
            void (async () => {
              switch (event.detail.selectedId) {
                case "public-site": {
                  if (selectedBranch?.customDomain) {
                    window.open(`http://${selectedBranch.customDomain}:5173`, "_blank", "noopener,noreferrer");
                  }
                  break;
                }
                case "logout":
                  await signOut();
                  queryClient.clear();
                  await navigate({ to: "/login" });
                  break;
                default: {
                  const section = SECTIONS.find((item) => item.id === event.detail.selectedId);
                  await navigate({ to: section?.path ?? "/" });
                  break;
                }
              }

              if (isMobile) {
                closeSidebar();
              }
            })();
          }}
          open={false}
        >
          <div slot="header" className="admin-sidebar-identity">
            <div className="admin-sidebar-kicker">QMenut</div>
            <div className="admin-sidebar-title">{tenant.restaurant.name}</div>
            {tenant.branches.length > 1 ? (
              <label className="admin-branch-select">
                <span>Sucursal</span>
                <select
                  onChange={(event) => {
                    setSelectedBranchId(event.currentTarget.value);
                  }}
                  value={selectedBranch?.id ?? ""}
                >
                  {tenant.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="admin-sidebar-copy">{selectedBranch?.name}</p>
            )}
          </div>
          <div slot="footer" className="admin-sidebar-footer">
            <mc-theme-switcher
              aria-label="Tema de color"
              dark-label="Oscuro"
              light-label="Claro"
              onmc-theme-change={(event) => {
                setTheme(event.detail.theme);
              }}
              theme={theme}
            />
          </div>
        </McSidebarNav>
      </div>

      <header slot="header" className="admin-topbar">
        <div>
          <div className="admin-kicker">{tenant.restaurant.name}</div>
          <h1>{sectionLabel}</h1>
        </div>
        <div className="admin-topbar-actions">
          <mc-button className="admin-inline-button" onClick={toggleSidebar} variant="secondary">
            {isSidebarOpen ? "Ocultar navegación" : "Abrir navegación"}
          </mc-button>
        </div>
      </header>

      <div slot="main" className="admin-main-slot">
        <Outlet />
      </div>
    </McAppShell>
  );
}
