import { Suspense } from "react";
import { FormProvider } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormColorInput } from "~/shared/components/forms/form-color-input";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NoDomainState } from "~/shared/components/state/no-domain-state";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { ThemePreview } from "../components/theme-preview";
import { useThemeController } from "../hooks/use-theme-controller";
import { BODY_FONT_OPTIONS, HEADING_FONT_OPTIONS, THEME_OPTIONS } from "../types";

import type { ThemeFormValues } from "../types";

export function ThemePage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description={i18n.t("theme___Crea una sucursal para personalizar su tema.")} />;
  if (!branch.customDomain)
    return (
      <NoDomainState
        description={i18n.t("theme___El tema se guarda por dominio. Contacta con QMenut para asignarlo.")}
      />
    );
  return (
    <div className={"ming-page admin-page admin-theme-page"}>
      <PageHeader
        kicker={i18n.t("theme___Tema · {{domain}}", { domain: branch.customDomain })}
        title={i18n.t("theme___Personalización")}
      />
      <Suspense fallback={<CardSkeleton rows={6} />}>
        <ThemeForm branchId={branch.id} host={branch.customDomain} key={branch.id} />
      </Suspense>
    </div>
  );
}
function ThemeForm({ branchId, host }: { branchId: string; host: string }) {
  const canWrite = useCan("theme.write");
  const controller = useThemeController(branchId);
  useEditorGuard({ dirty: controller.form.formState.isDirty, pending: controller.pending });
  return (
    <FormProvider {...controller.form}>
      <div className="admin-theme-workspace">
        <FormShell
          busy={controller.pending}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
          submitLabel={i18n.t("theme___Guardar tema")}
        >
          <section className="admin-editor-section">
            <h2 className={"ming-section__title"}>{i18n.t("theme___Identidad de la carta")}</h2>
            <p className={"ming-section__description"}>
              {i18n.t("theme___Elige el estilo, los colores de marca y el mensaje de bienvenida.")}
            </p>
            <div className="admin-form-grid">
              <FormSelect<ThemeFormValues>
                label={i18n.t("theme___Plantilla")}
                name={"template"}
                options={THEME_OPTIONS}
              />
              <fieldset className={"admin-form-grid admin-form-grid--two"}>
                <FormColorInput<ThemeFormValues> label={i18n.t("theme___Color primario")} name={"primary"} />
                <FormColorInput<ThemeFormValues> label={i18n.t("theme___Color secundario")} name={"secondary"} />
              </fieldset>
              <FormTextInput<ThemeFormValues> label={i18n.t("theme___Eslogan")} maxLength={120} name={"tagline"} />
            </div>
          </section>
          <section className="admin-editor-section">
            <h2 className={"ming-section__title"}>{i18n.t("theme___Tipografía")}</h2>
            <p className={"ming-section__description"}>
              {i18n.t("theme___Combina una familia para los títulos con otra para el contenido de la carta.")}
            </p>
            <div className={"admin-form-grid admin-form-grid--two"}>
              <FormSelect<ThemeFormValues>
                label={i18n.t("theme___Tipografía de títulos")}
                name={"headingFont"}
                options={HEADING_FONT_OPTIONS}
              />
              <FormSelect<ThemeFormValues>
                label={i18n.t("theme___Tipografía de cuerpo")}
                name={"bodyFont"}
                options={BODY_FONT_OPTIONS}
              />
            </div>
          </section>
          <section className="admin-editor-section">
            <h2 className={"ming-section__title"}>{i18n.t("theme___Fotografías")}</h2>
            <p className={"ming-section__description"}>
              {i18n.t("theme___Estas opciones prevalecen sobre el estilo recomendado por la plantilla.")}
            </p>
            <div className={"admin-choice-grid admin-theme-photo-controls"}>
              <FormCheckbox<ThemeFormValues>
                label={i18n.t("theme___Mostrar fotos en la carta")}
                name={"showMenuPhotos"}
              />
              <FormCheckbox<ThemeFormValues>
                label={i18n.t("theme___Mostrar foto al abrir un plato")}
                name={"showDishPhoto"}
              />
            </div>
          </section>
        </FormShell>
        <ThemePreview draft={controller.preview} host={host} />
      </div>
    </FormProvider>
  );
}
