import { formatDate } from "~/shared/services/format";

import type {
  AttentionItem,
  AttentionSeverity,
  DashboardBillingOverview,
  DashboardCategory,
  DashboardDish,
  DashboardTenant,
  TranslationCoverage,
} from "~/features/dashboard/types";

const SEVERITY_WEIGHT: Record<AttentionSeverity, number> = { error: 0, warning: 1, info: 2 };
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_WARNING_DAYS = 5;

export function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  return items.toSorted(
    (a, b) => SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity] || a.label.localeCompare(b.label),
  );
}

export function getBranchAttentionItems(branches: DashboardTenant["branches"]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const branch of branches) {
    if (!branch.isActive) {
      items.push({
        detail: "La carta de esta sucursal no es visible al público.",
        id: `branch-inactive-${branch.id}`,
        label: `${branch.name} está desactivada`,
        linkTo: "/branch",
        severity: "warning",
      });
    }
    if (!branch.customDomain) {
      items.push({
        detail: "Configura el dominio para que tus clientes puedan abrir la carta.",
        id: `branch-domain-${branch.id}`,
        label: `${branch.name} sin dominio público`,
        linkTo: "/branch",
        severity: "warning",
      });
    }
  }
  return items;
}

interface SubscriptionBranch {
  branchName: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  status: DashboardBillingOverview["branches"][number]["status"];
}

function getDaysLeft(branch: SubscriptionBranch): number | null {
  return branch.currentPeriodEnd === null ? null : Math.ceil((branch.currentPeriodEnd - Date.now()) / DAY_MS);
}

function getSubscriptionItem(branch: SubscriptionBranch): AttentionItem | null {
  const base = { id: `sub-${branch.branchName}`, linkTo: "/billing" } as const;
  const daysLeft = getDaysLeft(branch);
  switch (branch.status) {
    case null: {
      return {
        ...base,
        detail: "Activa el plan para mantener la carta publicada en el dominio.",
        label: `${branch.branchName} sin suscripción`,
        severity: "warning",
      };
    }
    case "trialing": {
      const endingSoon = daysLeft !== null && daysLeft <= TRIAL_WARNING_DAYS;
      return {
        ...base,
        detail: endingSoon
          ? `Termina el ${formatDate(branch.currentPeriodEnd)}. Configura el pago para no interrumpir el servicio.`
          : "Configura el pago antes del fin de la prueba.",
        label: `Prueba activa en ${branch.branchName}`,
        severity: endingSoon ? "warning" : "info",
      };
    }
    case "past_due": {
      return {
        ...base,
        detail: "Actualiza el método de pago para evitar la suspensión del servicio.",
        label: `Pago pendiente en ${branch.branchName}`,
        severity: "error",
      };
    }
    case "canceled": {
      return {
        ...base,
        detail: "Reactiva la suscripción para volver a publicar la carta.",
        label: `Suscripción cancelada en ${branch.branchName}`,
        severity: "warning",
      };
    }
    case "active": {
      if (!branch.cancelAtPeriodEnd || branch.currentPeriodEnd === null) return null;
      return {
        ...base,
        detail: `Se desactiva el ${formatDate(branch.currentPeriodEnd)}.`,
        label: `Suscripción de ${branch.branchName} finaliza pronto`,
        severity: "info",
      };
    }
  }
}

export function getSubscriptionAttentionItems(overview: DashboardBillingOverview): AttentionItem[] {
  return overview.branches
    .map((branch) => getSubscriptionItem(branch))
    .filter((item): item is AttentionItem => item !== null);
}

export function getMenuAttentionItems(categories: DashboardCategory[], dishes: DashboardDish[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  const hiddenDishes = dishes.filter((dish) => !dish.isActive).length;
  if (hiddenDishes > 0) {
    items.push({
      detail: "No aparecen en la carta pública hasta que los vuelvas a activar.",
      id: "menu-hidden-dishes",
      label: `${hiddenDishes} ${hiddenDishes === 1 ? "plato oculto" : "platos ocultos"}`,
      linkTo: "/menu",
      severity: "info",
    });
  }
  const imagelessCategories = categories.filter((category) => !category.imageUrl).length;
  if (imagelessCategories > 0) {
    items.push({
      detail: "Una foto ayuda a que la sección destaque en la carta.",
      id: "menu-category-images",
      label: `${imagelessCategories} ${imagelessCategories === 1 ? "categoría sin foto" : "categorías sin foto"}`,
      linkTo: "/menu",
      severity: "info",
    });
  }
  return items;
}

export function getTranslationCoverageItems(coverages: TranslationCoverage[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const coverage of coverages) {
    const untranslated = coverage.total - coverage.translated;
    if (coverage.total === 0 || untranslated <= 0) continue;
    const percent = Math.round((coverage.translated / coverage.total) * 100);
    const pendingNote = coverage.pending > 0 ? ` · ${coverage.pending} pendientes de revisión` : "";
    items.push({
      detail: `${untranslated} ${untranslated === 1 ? "texto sin traducir" : "textos sin traducir"}${pendingNote}.`,
      id: `translations-${coverage.languageCode}`,
      label: `Traducción al ${coverage.label} al ${percent}%`,
      linkParams: { languageCode: coverage.languageCode },
      linkTo: "/languages/$languageCode",
      severity: percent < 50 ? "warning" : "info",
    });
  }
  return items;
}
