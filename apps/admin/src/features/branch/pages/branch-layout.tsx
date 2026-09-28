import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Suspense } from "react";
import { FormProvider } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { AdminThemePreference } from "~/shared/components/theme_preference/theme_preference";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { BranchFormProvider } from "../branch-form-context";
import { useBranchController } from "../hooks/use-branch-controller";

const TABS = [
  { label: i18n.t("branch___General"), path: "/branch" },
  { label: i18n.t("branch___Galería"), path: "/branch/galeria" },
  { label: i18n.t("branch___Horario"), path: "/branch/horario" },
  { label: i18n.t("branch___Legal"), path: "/branch/legal" },
] as const;

export function BranchLayout() {
  const branch = useSelectedBranch();
  const canWrite = useCan("branch.write");
  const location = useLocation();
  if (!branch) return <NoBranchState description={i18n.t("branch___No hay ninguna sucursal disponible.")} />;
  return (
    <div className={"ming-page admin-page admin-branch-page"}>
      <PageHeader kicker={i18n.t("branch___Sucursal")} title={branch.name} />
      <nav aria-label={i18n.t("branch___Secciones de la sucursal")} className="admin-branch-tabs">
        {TABS.map((tab) => (
          <Link
            activeOptions={{ exact: true }}
            aria-current={location.pathname === tab.path ? "page" : undefined}
            className="admin-branch-tab"
            key={tab.path}
            to={tab.path}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <Suspense fallback={<CardSkeleton rows={5} />}>
        <BranchLayoutForm branchId={branch.id} canWrite={canWrite} key={branch.id} />
      </Suspense>
      <AdminThemePreference />
    </div>
  );
}

function BranchLayoutForm({ branchId, canWrite }: { branchId: string; canWrite: boolean }) {
  const controller = useBranchController(branchId);
  return (
    <BranchFormProvider value={{ branchId, controller }}>
      <FormProvider {...controller.form}>
        <FormShell
          operation={controller.operation}
          busy={controller.pending}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <Outlet />
        </FormShell>
      </FormProvider>
    </BranchFormProvider>
  );
}
