import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";

import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { AdminThemePreference } from "~/shared/components/theme_preference/theme_preference";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { BranchFormProvider } from "../branch-form-context";
import { useBranchController } from "../hooks/use-branch-controller";

const TABS = [
  { label: "General", path: "/branch" },
  { label: "Galería", path: "/branch/galeria" },
  { label: "Horario", path: "/branch/horario" },
  { label: "Legal", path: "/branch/legal" },
] as const;

export function BranchLayout() {
  const branch = useSelectedBranch();
  const canWrite = useCan("branch.write");
  const location = useLocation();
  if (!branch) return <NoBranchState description="No hay ninguna sucursal disponible." />;
  return <BranchLayoutForm branchId={branch.id} canWrite={canWrite} key={branch.id} pathname={location.pathname} />;
}

function BranchLayoutForm({ branchId, canWrite, pathname }: { branchId: string; canWrite: boolean; pathname: string }) {
  const controller = useBranchController(branchId);
  return (
    <div className="admin-page admin-branch-page">
      <PageHeader kicker="Sucursal" title={controller.settings.name} />
      <nav aria-label="Secciones de la sucursal" className="admin-branch-tabs">
        {TABS.map((tab) => (
          <Link
            activeOptions={{ exact: true }}
            aria-current={pathname === tab.path ? "page" : undefined}
            className="admin-branch-tab"
            key={tab.path}
            to={tab.path}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
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
      <AdminThemePreference />
    </div>
  );
}
