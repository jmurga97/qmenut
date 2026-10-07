import { AppShell, Select } from "@jmurga97/components";
import { can } from "@qmenut/permissions";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";

import { getListRestaurantsQueryOptions } from "~/features/auth/api";
import { useSelectRestaurant } from "~/features/auth/hooks/use-select-restaurant";
import { signOut } from "~/lib/auth-client";
import { FEATURES } from "~/lib/features";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { ImageActivityToasts } from "~/shared/images/image-activity";
import { buildPublicMenuUrl } from "~/shared/services/public-menu-url";
import { resolveSelectedBranch, useBranchStore } from "~/shared/stores/branch-store";
import {
  isEditorBusy,
  useEditorBusy,
  useShellActions,
  useShellMobile,
  useSidebarOpen,
} from "~/shared/stores/shell-store";
import "~/shared/images/styles.css";

import { AdminSidebar } from "./admin-sidebar";

import type { NavListItem } from "@jmurga97/components";
import type { Permission } from "@qmenut/permissions";

interface Section {
  id: string;
  label: string;
  path: string;
  permission?: Permission;
}

const SECTIONS = [
  { id: "overview", label: i18n.t("shell___Resumen"), path: "/" },
  {
    id: "analytics",
    label: i18n.t("shell___Analítica"),
    path: "/analytics",
    permission: "analytics.read",
  },
  { id: "menu", label: i18n.t("shell___Menú"), path: "/menu" },
  {
    id: "promotions",
    label: i18n.t("shell___Promociones"),
    path: "/promotions",
  },
  {
    id: "loyalty",
    label: i18n.t("shell___Fidelización"),
    path: "/loyalty",
  },
  { id: "theme", label: i18n.t("shell___Tema"), path: "/theme" },
  {
    id: "languages",
    label: i18n.t("shell___Idiomas"),
    path: "/languages",
  },
  { id: "qr", label: i18n.t("shell___Código QR"), path: "/qr" },
  { id: "branch", label: i18n.t("shell___Sucursal"), path: "/branch" },
  {
    id: "users",
    label: i18n.t("shell___Usuarios"),
    path: "/users",
    permission: "users.manage",
  },
] as const satisfies readonly Section[];

function getCurrentSectionLabel(pathname: string) {
  const section = SECTIONS.find((item) => item.path !== "/" && pathname.startsWith(item.path));
  return section?.label ?? i18n.t("shell___Resumen");
}

function getNavigationItems(pathname: string, roleCode: Parameters<typeof can>[0]): NavListItem[] {
  return SECTIONS.filter((section) => section.id !== "analytics" || FEATURES.analytics)
    .filter((section) => !("permission" in section) || can(roleCode, section.permission))
    .map((section) => ({
      current: section.path === "/" ? pathname === "/" : pathname.startsWith(section.path),
      href: section.path,
      id: section.id,
      label: section.label,
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
  const editorBusy = useEditorBusy();
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
    if (isEditorBusy()) return;
    await signOut();
    queryClient.clear();
    await navigate({ to: "/login" });
    if (isMobile) closeSidebar();
  }
  return (
    <AppShell
      className="admin-app-shell"
      header={
        <div className="admin-topbar">
          <nav aria-label={i18n.t("shell___Ruta")}>
            <ol className={"ming-breadcrumb"}>
              <li>{"QMenut"}</li>
              <li aria-current={"page"}>{sectionLabel}</li>
            </ol>
          </nav>
          {memberships.length > 1 ? (
            <div className="admin-topbar-actions">
              <Select
                ariaLabel={i18n.t("shell___Restaurante activo")}
                disabled={selectRestaurant.isPending}
                onValueChange={(restaurantId) => {
                  if (restaurantId && restaurantId !== tenant.restaurant.id && !isEditorBusy()) {
                    selectRestaurant.mutate({ restaurantId });
                  }
                }}
                options={memberships.map((membership) => ({ id: membership.restaurantId, label: membership.name }))}
                value={tenant.restaurant.id}
              />
            </div>
          ) : null}
        </div>
      }
      navigation={
        <AdminSidebar
          disabled={editorBusy}
          branches={tenant.branches}
          items={getNavigationItems(location.pathname, tenant.roleCode)}
          onIntent={(href) => void router.preloadRoute({ to: href })}
          onBranchChange={(branchId) => {
            if (isEditorBusy()) return;
            setSelectedBranchId(branchId);
            void router.invalidate();
          }}
          onNavigate={(selectedId) => void selectNavigation(selectedId)}
          onLogout={() => void logout()}
          publicMenuUrl={selectedBranch?.customDomain ? buildPublicMenuUrl(selectedBranch.customDomain) : null}
          restaurantName={tenant.restaurant.name}
          selectedBranch={selectedBranch}
        />
      }
      navigationLabel={i18n.t("shell___Navegación del panel")}
      closeNavigationLabel={i18n.t("shell___Cerrar navegación")}
      hideNavigationLabel={i18n.t("shell___Ocultar navegación")}
      onOpenChange={setSidebarOpen}
      open={isSidebarOpen}
      showNavigationLabel={i18n.t("shell___Mostrar navegación")}
    >
      <div className="admin-main-slot">
        {selectedBranch ? <ImageActivityToasts branchId={selectedBranch.id} /> : null}
        <Outlet />
      </div>
    </AppShell>
  );
}
