import { FormProvider } from "react-hook-form";

import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormColorInput } from "~/shared/components/forms/form-color-input";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NoDomainState } from "~/shared/components/state/no-domain-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { ThemePreview } from "../components/theme-preview";
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
    <div className="admin-page admin-theme-page">
      <PageHeader kicker={`Tema · ${host}`} title="Personalización" />
      <FormProvider {...controller.form}>
        <div className="admin-theme-workspace">
          <FormShell
            busy={controller.pending}
            error={controller.feedback.error}
            onSubmit={() => void controller.submit()}
            readOnly={!canWrite}
            submitLabel="Guardar tema"
            success={controller.feedback.success}
          >
            <div className="admin-theme-controls">
              <section className="admin-theme-section" aria-labelledby="theme-identity-heading">
                <div className="admin-theme-section__heading">
                  <h3 id="theme-identity-heading">Identidad de la carta</h3>
                  <p>Elige el estilo, los colores de marca y el mensaje de bienvenida.</p>
                </div>
                <div className="admin-form-grid">
                  <FormSelect<ThemeFormValues> label="Plantilla" name="template" options={THEME_OPTIONS} />
                  <div className="admin-form-grid admin-form-grid--two">
                    <FormColorInput<ThemeFormValues> label="Color primario" name="primary" />
                    <FormColorInput<ThemeFormValues> label="Color secundario" name="secondary" />
                  </div>
                  <FormTextInput<ThemeFormValues> label="Eslogan" maxLength={120} name="tagline" />
                </div>
              </section>
              <section className="admin-theme-section" aria-labelledby="theme-photos-heading">
                <div className="admin-theme-section__heading">
                  <h3 id="theme-photos-heading">Fotografías</h3>
                  <p>Estas opciones prevalecen sobre el estilo recomendado por la plantilla.</p>
                </div>
                <div className="admin-choice-grid admin-theme-photo-controls">
                  <FormCheckbox<ThemeFormValues> label="Mostrar fotos en la carta" name="showMenuPhotos" />
                  <FormCheckbox<ThemeFormValues> label="Mostrar foto al abrir un plato" name="showDishPhoto" />
                </div>
              </section>
            </div>
          </FormShell>
          <ThemePreview draft={controller.preview} host={host} />
        </div>
      </FormProvider>
    </div>
  );
}
