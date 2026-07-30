import { FormProvider } from "react-hook-form";

import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormColorInput } from "~/shared/components/forms/form-color-input";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NoDomainState } from "~/shared/components/state/no-domain-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { useThemeController } from "../hooks/use-theme-controller";
import { THEME_OPTIONS } from "../types";

import type { ThemeFormValues } from "../types";

export function ThemePage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para personalizar su tema." />;
  if (!branch.customDomain)
    return <NoDomainState description="El tema se guarda por dominio. Contacta con QMenut para asignarlo." />;
  return <ThemeForm branchId={branch.id} host={branch.customDomain} key={branch.id} />;
}
function ThemeForm({ branchId, host }: { branchId: string; host: string }) {
  const canWrite = useCan("theme.write");
  const controller = useThemeController(branchId);
  return (
    <div className="admin-page">
      <PageHeader kicker={`Tema · ${host}`} title="Personalización" />
      <FormProvider {...controller.form}>
        <FormShell
          busy={controller.pending}
          error={controller.feedback.error}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
          submitLabel="Guardar tema"
          success={controller.feedback.success}
        >
          <div className="admin-form-grid">
            <FormSelect<ThemeFormValues> label="Plantilla" name="template" options={THEME_OPTIONS} />
            <FormColorInput<ThemeFormValues> label="Color primario" name="primary" />
            <FormColorInput<ThemeFormValues> label="Color secundario" name="secondary" />
            <FormTextInput<ThemeFormValues> label="Eslogan" maxLength={120} name="tagline" />
          </div>
          <div className="admin-theme-preview" style={{ borderColor: controller.preview.primary }}>
            <span className="admin-theme-swatch" style={{ background: controller.preview.primary }} />
            <span className="admin-theme-swatch" style={{ background: controller.preview.secondary }} />
            <span className="admin-list-meta">{controller.preview.tagline || "Sin eslogan"}</span>
          </div>
        </FormShell>
      </FormProvider>
    </div>
  );
}
