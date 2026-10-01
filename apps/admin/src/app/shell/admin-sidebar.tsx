import { Button, Select, SidebarNav } from "@jmurga97/components";
import { useState } from "react";

import { i18n } from "~/lib/i18n";
import { useInstallPrompt } from "~/shared/hooks/use-install-prompt";

import type { NavListItem } from "@jmurga97/components";
import type { SyntheticEvent } from "react";

interface AdminSidebarBranch {
  customDomain: string | null;
  id: string;
  name: string;
}

interface AdminSidebarProps {
  disabled?: boolean;
  branches: AdminSidebarBranch[];
  items: NavListItem[];
  onBranchChange: (branchId: string) => void;
  /** Hover or focus on a section link; receives its href so the route can preload. */
  onIntent: (href: string) => void;
  /** Navigates to a section id from `items`; session actions use `onLogout`. */
  onNavigate: (selectedId: string) => void;
  onLogout: () => void;
  publicMenuUrl: string | null;
  restaurantName: string;
  selectedBranch: AdminSidebarBranch | null;
}

export function AdminSidebar({
  disabled = false,
  branches,
  items,
  onBranchChange,
  onIntent,
  onNavigate,
  onLogout,
  publicMenuUrl,
  restaurantName,
  selectedBranch,
}: AdminSidebarProps) {
  const [selectPortalContainer, setSelectPortalContainer] = useState<HTMLElement | null>(null);
  const { install, mode: installMode } = useInstallPrompt();
  const domainStatus = selectedBranch?.customDomain ?? i18n.t("shell___Sin dominio público");

  // SidebarNav renders plain anchors, so router Link's intent preload never fires; delegate it from here.
  function preloadIntent(event: SyntheticEvent) {
    const href = event.target instanceof Element ? event.target.closest("a[href]")?.getAttribute("href") : null;
    if (href && items.some((item) => item.href === href)) onIntent(href);
  }

  return (
    <div
      className="admin-sidebar"
      inert={disabled}
      onFocus={preloadIntent}
      onPointerOver={preloadIntent}
      ref={setSelectPortalContainer}
    >
      <SidebarNav
        ariaLabel={i18n.t("shell___Navegación del panel")}
        header={
          <div className="admin-sidebar-identity">
            <div className={"ming-eyebrow"}>{"QMenut"}</div>
            <div className="admin-sidebar-title" title={restaurantName}>
              {restaurantName}
            </div>
            <div className="admin-branch-select">
              <span className={"ming-eyebrow"}>{i18n.t("shell___Sucursal activa")}</span>
              <Select
                ariaLabel={i18n.t("shell___Sucursal activa")}
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
          </div>
        }
        items={items}
        onNavigate={onNavigate}
        footer={
          <div className="admin-sidebar-footer">
            {publicMenuUrl ? (
              <a aria-describedby="admin-sidebar-domain" href={publicMenuUrl} rel={"noreferrer"} target={"_blank"}>
                {i18n.t("shell___Ver carta ↗")}
              </a>
            ) : null}
            {installMode === "prompt" ? (
              <Button onClick={install} variant={"ghost"}>
                {i18n.t("shell___Instalar app")}
              </Button>
            ) : null}
            {installMode === "ios" ? (
              <span className="admin-sidebar-domain">{i18n.t("shell___Instalar: Compartir → Añadir a inicio")}</span>
            ) : null}
            <Button onClick={onLogout} variant={"ghost"}>
              {i18n.t("shell___Cerrar sesión")}
            </Button>
          </div>
        }
      />
    </div>
  );
}
