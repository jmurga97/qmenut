import { McAppShell, McSidebarNav } from "@murga.ing/components/react";
import { can } from "@qmenut/permissions";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";

import { resolveSelectedBranch, useBranchStore } from "~/app/store/branch-store";
import { useShellActions, useShellMobile, useSidebarOpen } from "~/app/store/shell-store";
import { signOut } from "~/lib/auth-client";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";

const SECTIONS = [
  { id: "overview", icon: "grid", label: "Resumen", path: "/" },
  { id: "menu", icon: "list", label: "Menú", path: "/menu" },
  { id: "branch", icon: "settings", label: "Sucursal", path: "/branch" },
  { id: "promotions", icon: "tag", label: "Promociones", path: "/promotions" },
  { id: "loyalty", icon: "user", label: "Fidelización", path: "/loyalty" },
  { id: "theme", icon: "settings", label: "Tema", path: "/theme" },
  { id: "qr", icon: "grid", label: "Código QR", path: "/qr" },
  { id: "languages", icon: "list", label: "Idiomas", path: "/languages" },
  {
    id: "billing",
    icon: "settings",
    label: "Facturación",
    path: "/billing",
    permission: "billing.manage",
  },
] as const;
function getCurrentSectionLabel(pathname: string) {
  const section = SECTIONS.find((item) => item.path !== "/" && pathname.startsWith(item.path));
  return section?.label ?? "Resumen";
}
function getNavigationItems(pathname: string, roleCode: Parameters<typeof can>[0]) {
  return SECTIONS.filter((section) => !("permission" in section) || can(roleCode, section.permission)).map(
    (section) => ({
      id: section.id,
      icon: section.icon,
      label: section.label,
      current: section.path === "/" ? pathname === "/" : pathname.startsWith(section.path),
    }),
  );
}
const FOOTER_ITEMS = [
  { id: "public-site", label: "Ver carta", description: "Abrir la carta pública de la sucursal" },
  { id: "logout", label: "Salir", description: "Cerrar sesión del panel" },
];
export function AdminShell() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const isMobile = useShellMobile();
  const isSidebarOpen = useSidebarOpen();
  const { closeSidebar, setSidebarOpen } = useShellActions();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const setSelectedBranchId = useBranchStore((state) => state.setSelectedBranchId);
  const selectedBranch = resolveSelectedBranch(tenant.branches, selectedBranchId);
  const sectionLabel = getCurrentSectionLabel(location.pathname);
  async function selectNavigation(selectedId: string) {
    if (selectedId === "public-site") {
      if (selectedBranch?.customDomain) {
        window.open(`http://${selectedBranch.customDomain}:5173`, "_blank", "noopener,noreferrer");
      }
    } else if (selectedId === "logout") {
      await signOut();
      queryClient.clear();
      await navigate({ to: "/login" });
    } else {
      const section = SECTIONS.find((item) => item.id === selectedId);
      await navigate({ to: section?.path ?? "/" });
    }
    if (isMobile) closeSidebar();
  }
  return (
    <McAppShell
      className="admin-app-shell"
      collapseLabel="Ocultar navegación"
      expandLabel="Abrir navegación"
      mobileOverlay={isMobile}
      onMcSidebarOpenChange={(event) => setSidebarOpen(event.detail.open)}
      sidebarOpen={isSidebarOpen}
    >
      <McSidebarNav
        ariaLabel="Navegación del panel"
        className="admin-sidebar-slot"
        collapsed={!isSidebarOpen}
        footerItems={FOOTER_ITEMS}
        items={getNavigationItems(location.pathname, tenant.roleCode)}
        onMcSelect={(event) => void selectNavigation(event.detail.selectedId)}
        open={false}
        slot="sidebar"
      >
        <div slot="header" className="admin-sidebar-identity">
          <div className="admin-sidebar-kicker">QMenut</div>
          <div className="admin-sidebar-title">{tenant.restaurant.name}</div>
          <label className="admin-branch-select">
            <span>Sucursal</span>
            <select
              disabled={tenant.branches.length < 2}
              onChange={(event) => {
                setSelectedBranchId(event.currentTarget.value);
                void router.invalidate();
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
        </div>
      </McSidebarNav>
      <header slot="header" className="admin-topbar">
        <div>
          <div className="admin-kicker">{tenant.restaurant.name}</div>
          <h1>{sectionLabel}</h1>
        </div>
      </header>
      <div slot="main" className="admin-main-slot">
        <Outlet />
      </div>
    </McAppShell>
  );
}
