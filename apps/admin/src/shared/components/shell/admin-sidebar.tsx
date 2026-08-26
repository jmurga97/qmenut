import { NavList, Select } from "@jmurga97/components";
import { useState } from "react";

import type { NavListItem } from "@jmurga97/components";
import type { ReactNode } from "react";

export type AdminSidebarIconName =
  | "billing"
  | "branch"
  | "languages"
  | "logout"
  | "loyalty"
  | "menu"
  | "overview"
  | "promotions"
  | "public-site"
  | "qr"
  | "theme";

export interface AdminSidebarItem extends Omit<NavListItem, "icon"> {
  icon: AdminSidebarIconName;
}

export interface AdminSidebarGroup {
  id: string;
  items: AdminSidebarItem[];
  label: string;
}

interface AdminSidebarBranch {
  customDomain: string | null;
  id: string;
  name: string;
}

export interface AdminSidebarRestaurant {
  id: string;
  label: string;
}

interface AdminSidebarProps {
  activeRestaurantId?: string | null;
  branches: AdminSidebarBranch[];
  groups: AdminSidebarGroup[];
  onBranchChange: (branchId: string) => void;
  /** Navigates to a section id from `groups`; session actions use `onLogout`. */
  onNavigate: (selectedId: string) => void;
  onLogout: () => void;
  onRestaurantChange?: (restaurantId: string) => void;
  publicMenuUrl: string | null;
  restaurantName: string;
  restaurants?: AdminSidebarRestaurant[];
  restaurantSwitching?: boolean;
  selectedBranch: AdminSidebarBranch | null;
}

const ICONS: Record<AdminSidebarIconName, ReactNode> = {
  billing: (
    <>
      <path d="M5 3.5h10v13l-2-1.25L10 16.5l-3-1.25L5 16.5v-13Z" />
      <path d="M7.5 7h5M7.5 10h5" />
    </>
  ),
  branch: (
    <>
      <path d="M3.5 8.25h13L15 4H5L3.5 8.25Z" />
      <path d="M4.5 8.25v8h11v-8M8 16.25v-4.5h4v4.5" />
    </>
  ),
  languages: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M3.75 10h12.5M10 3.5c2 1.8 3 3.97 3 6.5s-1 4.7-3 6.5c-2-1.8-3-3.97-3-6.5s1-4.7 3-6.5Z" />
    </>
  ),
  logout: (
    <>
      <path d="M8 4H4.5v12H8M11.5 6.5 15 10l-3.5 3.5M7 10h8" />
    </>
  ),
  loyalty: <path d="M10 16s-6-3.4-6-8a3.25 3.25 0 0 1 6-1.75A3.25 3.25 0 0 1 16 8c0 4.6-6 8-6 8Z" />,
  menu: (
    <>
      <path d="M4 4.5h12v11H4zM7 8h6M7 11h4" />
    </>
  ),
  overview: (
    <>
      <rect height="5" rx="1" width="5" x="3.5" y="3.5" />
      <rect height="5" rx="1" width="5" x="11.5" y="3.5" />
      <rect height="5" rx="1" width="5" x="3.5" y="11.5" />
      <rect height="5" rx="1" width="5" x="11.5" y="11.5" />
    </>
  ),
  promotions: (
    <>
      <path d="m3.5 9 5.5-5.5h6.5v6.5L10 15.5 3.5 9Z" />
      <circle cx="12.75" cy="6.25" r="1" />
    </>
  ),
  "public-site": (
    <>
      <path d="M11 4h5v5M9 11l7-7M15 11.5V16H4V5h4.5" />
    </>
  ),
  qr: (
    <>
      <path d="M4 4h4v4H4zM12 4h4v4h-4zM4 12h4v4H4zM12 12h1.5v1.5H12zM14.5 14.5H16V16h-1.5zM14.5 11.75H16" />
    </>
  ),
  theme: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5a6.5 6.5 0 0 0 0 13V3.5Z" />
    </>
  ),
};

function AdminSidebarIcon({ name }: { name: AdminSidebarIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="admin-sidebar-icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 20 20"
    >
      {ICONS[name]}
    </svg>
  );
}

export function AdminSidebar({
  activeRestaurantId,
  branches,
  groups,
  onBranchChange,
  onNavigate,
  onLogout,
  onRestaurantChange,
  publicMenuUrl,
  restaurantName,
  restaurants,
  restaurantSwitching = false,
  selectedBranch,
}: AdminSidebarProps) {
  const [selectPortalContainer, setSelectPortalContainer] = useState<HTMLElement | null>(null);
  const domainStatus = selectedBranch?.customDomain ?? "Sin dominio público";
  const canSwitchRestaurant = Boolean(onRestaurantChange) && (restaurants?.length ?? 0) > 1;
  return (
    <nav aria-label="Navegación del panel" className="admin-sidebar" ref={setSelectPortalContainer}>
      <header className="admin-sidebar-identity">
        <div className="admin-sidebar-kicker">QMenut</div>
        {canSwitchRestaurant && restaurants ? (
          <div className="admin-restaurant-select">
            <span>Restaurante</span>
            <Select
              ariaLabel="Restaurante activo"
              disabled={restaurantSwitching}
              onValueChange={(restaurantId) => {
                if (restaurantId && restaurantId !== activeRestaurantId) {
                  onRestaurantChange?.(restaurantId);
                }
              }}
              options={restaurants}
              portalContainer={selectPortalContainer}
              value={activeRestaurantId ?? null}
            />
          </div>
        ) : null}
        <div className="admin-sidebar-title" title={restaurantName}>
          {restaurantName}
        </div>
        <div className="admin-branch-select">
          <span>Sucursal activa</span>
          <Select
            ariaLabel="Sucursal activa"
            disabled={branches.length < 2}
            onValueChange={(branchId) => {
              if (branchId) onBranchChange(branchId);
            }}
            options={branches.map((branch) => ({ id: branch.id, label: branch.name }))}
            portalContainer={selectPortalContainer}
            value={selectedBranch?.id ?? null}
          />
          <span className="admin-sidebar-domain" id="admin-sidebar-domain" title={domainStatus}>
            {domainStatus}
          </span>
        </div>
      </header>

      <div className="admin-sidebar-groups">
        {groups.map((group) => {
          const labelId = `admin-sidebar-group-${group.id}`;
          return (
            <section aria-labelledby={labelId} className="admin-sidebar-group" key={group.id}>
              <h2 id={labelId}>{group.label}</h2>
              <NavList
                items={group.items.map((item) => ({
                  ...item,
                  icon: <AdminSidebarIcon name={item.icon} />,
                }))}
                onNavigate={onNavigate}
              />
            </section>
          );
        })}
      </div>

      <footer className="admin-sidebar-footer">
        {publicMenuUrl ? (
          <a
            aria-describedby="admin-sidebar-domain"
            className="admin-sidebar-action"
            href={publicMenuUrl}
            rel="noreferrer"
            target="_blank"
          >
            <AdminSidebarIcon name="public-site" />
            <span>Ver carta</span>
          </a>
        ) : (
          <span aria-disabled="true" className="admin-sidebar-action">
            <AdminSidebarIcon name="public-site" />
            <span>Ver carta</span>
          </span>
        )}
        <button className="admin-sidebar-action admin-sidebar-action--destructive" onClick={onLogout} type="button">
          <AdminSidebarIcon name="logout" />
          <span>Cerrar sesión</span>
        </button>
      </footer>
    </nav>
  );
}
