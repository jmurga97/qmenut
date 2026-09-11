import { NavList, Select } from "@jmurga97/components";
import { useState } from "react";

import { Icon } from "~/shared/components/icon";

import type { NavListItem } from "@jmurga97/components";
import type { IconName } from "~/shared/components/icon";

export interface AdminSidebarItem extends Omit<NavListItem, "icon"> {
  icon: IconName;
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
  disabled?: boolean;
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

export function AdminSidebar({
  disabled = false,
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
    <nav aria-label="Navegación del panel" className="admin-sidebar" inert={disabled} ref={setSelectPortalContainer}>
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
                  icon: <Icon className="admin-sidebar-icon" name={item.icon} />,
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
            <Icon className="admin-sidebar-icon" name="public-site" />
            <span>Ver carta</span>
          </a>
        ) : (
          <span aria-disabled="true" className="admin-sidebar-action">
            <Icon className="admin-sidebar-icon" name="public-site" />
            <span>Ver carta</span>
          </span>
        )}
        <button className="admin-sidebar-action admin-sidebar-action--destructive" onClick={onLogout} type="button">
          <Icon className="admin-sidebar-icon" name="logout" />
          <span>Cerrar sesión</span>
        </button>
      </footer>
    </nav>
  );
}
