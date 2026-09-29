import { Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { FormProvider } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { SectionTabs } from "~/shared/components/section-tabs";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { AdminThemePreference } from "~/shared/components/theme_preference/theme_preference";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { BranchFormProvider } from "../branch-form-context";
import { useBranchController } from "../hooks/use-branch-controller";

const TABS = [
  { exact: true, label: i18n.t("branch___General"), to: "/branch" },
  { label: i18n.t("branch___Galería"), to: "/branch/galeria" },
  { label: i18n.t("branch___Horario"), to: "/branch/horario" },
  { label: i18n.t("branch___Legal"), to: "/branch/legal" },
] as const;

export function BranchLayout() {
  const branch = useSelectedBranch();
  const canWrite = useCan("branch.write");
  if (!branch) return <NoBranchState description={i18n.t("branch___No hay ninguna sucursal disponible.")} />;
  return (
    <div className={"ming-page admin-page admin-branch-page"}>
      <PageHeader kicker={i18n.t("branch___Sucursal")} title={branch.name} />
      <SectionTabs ariaLabel={i18n.t("branch___Secciones de la sucursal")} tabs={TABS} />
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
