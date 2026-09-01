import { AppShell } from "@jmurga97/components";
import { can } from "@qmenut/permissions";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";

import { resolveSelectedBranch, useBranchStore } from "~/app/store/branch-store";
import { useShellActions, useShellMobile, useSidebarOpen } from "~/app/store/shell-store";
import { getListRestaurantsQueryOptions } from "~/features/auth/api";
import { useSelectRestaurant } from "~/features/auth/hooks/use-select-restaurant";
import { signOut } from "~/lib/auth-client";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { buildPublicMenuUrl } from "~/shared/services/public-menu-url";

import { AdminSidebar } from "./admin-sidebar";

import type { AdminSidebarGroup, AdminSidebarIconName } from "./admin-sidebar";
import type { Permission } from "@qmenut/permissions";

type NavigationGroupId = "business" | "operations" | "public-menu";

interface Section {
  group: NavigationGroupId;
  icon: AdminSidebarIconName;
  id: string;
  label: string;
  path: string;
  permission?: Permission;
}

const SECTIONS = [
  { group: "operations", icon: "overview", id: "overview", label: "Resumen", path: "/" },
  {
    group: "operations",
    icon: "analytics",
    id: "analytics",
    label: "Analítica",
    path: "/analytics",
    permission: "analytics.read",
  },
  { group: "operations", icon: "menu", id: "menu", label: "Menú", path: "/menu" },
  {
    group: "operations",
    icon: "promotions",
    id: "promotions",
    label: "Promociones",
    path: "/promotions",
  },
  {
    group: "operations",
    icon: "loyalty",
    id: "loyalty",
    label: "Fidelización",
    path: "/loyalty",
  },
  { group: "public-menu", icon: "theme", id: "theme", label: "Tema", path: "/theme" },
  {
    group: "public-menu",
    icon: "languages",
    id: "languages",
    label: "Idiomas",
    path: "/languages",
  },
  { group: "public-menu", icon: "qr", id: "qr", label: "Código QR", path: "/qr" },
  { group: "business", icon: "branch", id: "branch", label: "Sucursal", path: "/branch" },
  {
    group: "business",
    icon: "billing",
    id: "billing",
    label: "Facturación",
    path: "/billing",
    permission: "billing.manage",
  },
  {
    group: "business",
    icon: "users",
    id: "users",
    label: "Usuarios",
    path: "/users",
    permission: "users.manage",
  },
] as const satisfies readonly Section[];

const NAVIGATION_GROUPS = [
  { id: "operations", label: "Operación" },
  { id: "public-menu", label: "Carta pública" },
  { id: "business", label: "Negocio" },
] as const;

function getCurrentSectionLabel(pathname: string) {
  const section = SECTIONS.find((item) => item.path !== "/" && pathname.startsWith(item.path));
  return section?.label ?? "Resumen";
}

function getNavigationGroups(pathname: string, roleCode: Parameters<typeof can>[0]): AdminSidebarGroup[] {
  const visibleSections = SECTIONS.filter((section) => !("permission" in section) || can(roleCode, section.permission));
  return NAVIGATION_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: visibleSections
      .filter((section) => section.group === group.id)
      .map((section) => ({
        current: section.path === "/" ? pathname === "/" : pathname.startsWith(section.path),
        href: section.path,
        icon: section.icon,
        id: section.id,
        label: section.label,
      })),
  }));
}

export function AdminShell() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const { data: memberships } = useSuspenseQuery(getListRestaurantsQueryOptions({ trpc }));
  const selectRestaurant = useSelectRestaurant();
  const isMobile = useShellMobile();
  const isSidebarOpen = useSidebarOpen();
  const { closeSidebar, setSidebarOpen } = useShellActions();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const setSelectedBranchId = useBranchStore((state) => state.setSelectedBranchId);
  const selectedBranch = resolveSelectedBranch(tenant.branches, selectedBranchId);
  const sectionLabel = getCurrentSectionLabel(location.pathname);
  async function selectNavigation(selectedId: string) {
    const section = SECTIONS.find((item) => item.id === selectedId);
    await navigate({ to: section?.path ?? "/" });
    if (isMobile) closeSidebar();
  }
  async function logout() {
    await signOut();
    queryClient.clear();
    await navigate({ to: "/login" });
    if (isMobile) closeSidebar();
  }
  return (
    <AppShell
      className="admin-app-shell"
      header={
        <header className="admin-topbar">
          <div className="admin-topbar-copy">
            {selectedBranch ? <div className="admin-topbar-context">{selectedBranch.name}</div> : null}
            <h1>{sectionLabel}</h1>
          </div>
        </header>
      }
      navigation={
        <AdminSidebar
          activeRestaurantId={tenant.restaurant.id}
          branches={tenant.branches}
          groups={getNavigationGroups(location.pathname, tenant.roleCode)}
          onBranchChange={(branchId) => {
            setSelectedBranchId(branchId);
            void router.invalidate();
          }}
          onNavigate={(selectedId) => void selectNavigation(selectedId)}
          onLogout={() => void logout()}
          onRestaurantChange={(restaurantId) => selectRestaurant.mutate({ restaurantId })}
          publicMenuUrl={selectedBranch?.customDomain ? buildPublicMenuUrl(selectedBranch.customDomain) : null}
          restaurantName={tenant.restaurant.name}
          restaurants={memberships.map((membership) => ({ id: membership.restaurantId, label: membership.name }))}
          restaurantSwitching={selectRestaurant.isPending}
          selectedBranch={selectedBranch}
        />
      }
      navigationLabel="Navegación del panel"
      onOpenChange={setSidebarOpen}
      open={isSidebarOpen}
    >
      <div className="admin-main-slot">
        <Outlet />
      </div>
    </AppShell>
  );
}
