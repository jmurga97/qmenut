import { Suspense, useEffect } from "react";
import { FormProvider } from "react-hook-form";
import { toast } from "sonner";

import { i18n } from "~/lib/i18n";
import { notifyError } from "~/lib/notifications";
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
import { useSelectedLanguage } from "~/shared/hooks/use-selected-language";
import { useTranslationForm } from "~/shared/hooks/use-translation-form";

import { ThemePreview } from "../components/theme-preview";
import { useThemeController } from "../hooks/use-theme-controller";
import { BODY_FONT_OPTIONS, HEADING_FONT_OPTIONS, THEME_OPTIONS } from "../types";

import type { ThemeFormValues } from "../types";

export function ThemePage() {
  const branch = useSelectedBranch();
  const language = useSelectedLanguage();
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
        {!language.isDefault && language.languageCode ? (
          <TranslatedThemeForm
            branchId={branch.id}
            host={branch.customDomain}
            languageCode={language.languageCode}
            key={`${branch.id}:${language.languageCode}`}
          />
        ) : (
          <ThemeForm branchId={branch.id} host={branch.customDomain} key={branch.id} />
        )}
      </Suspense>
    </div>
  );
}
function TranslatedThemeForm({
  branchId,
  host,
  languageCode,
}: {
  branchId: string;
  host: string;
  languageCode: string;
}) {
  const translation = useTranslationForm({ branchId, languageCode });
  return <ThemeForm branchId={branchId} host={host} translation={translation} />;
}
function ThemeForm({
  branchId,
  host,
  translation,
}: {
  branchId: string;
  host: string;
  translation?: ReturnType<typeof useTranslationForm>;
}) {
  const canWrite = useCan("theme.write");
  const canTranslate = useCan("languages.write");
  const controller = useThemeController(branchId);
  const tagline = translation?.value({ entityType: "branch", entityId: branchId, field: "tagline" });
  useEffect(() => {
    if (tagline !== undefined && !controller.form.formState.isDirty)
      controller.form.reset({ ...controller.form.getValues(), tagline });
  }, [controller.form, tagline]);
  useEditorGuard({
    dirty: controller.form.formState.isDirty,
    pending: controller.pending || Boolean(translation?.pending),
  });
  async function submit() {
    if (!translation) {
      await controller.submit();
      return;
    }
    if (!canTranslate || !(await controller.form.trigger("tagline"))) return;
    const values = controller.form.getValues();
    const row = translation.saveRow({
      entityType: "branch",
      entityId: branchId,
      field: "tagline",
      value: values.tagline,
    });
    if (!row) return;
    try {
      await translation.saveRows([row]);
      controller.form.reset(values);
      toast.success(i18n.t("theme___Traducción guardada."));
    } catch (error) {
      notifyError(error);
    }
  }
  return (
    <FormProvider {...controller.form}>
      <div className="admin-theme-workspace">
        <FormShell
          busy={controller.pending || translation?.pending}
          onSubmit={() => void submit()}
          readOnly={translation ? !canTranslate : !canWrite}
          submitLabel={translation ? i18n.t("theme___Guardar traducción") : i18n.t("theme___Guardar tema")}
        >
          <section className="admin-editor-section">
            <h2 className={"ming-section__title"}>{i18n.t("theme___Identidad de la carta")}</h2>
            <p className={"ming-section__description"}>
              {i18n.t("theme___Elige el estilo, los colores de marca y el mensaje de bienvenida.")}
            </p>
            <div className="admin-form-grid">
              <FormSelect<ThemeFormValues>
                disabled={Boolean(translation)}
                label={i18n.t("theme___Plantilla")}
                name={"template"}
                options={THEME_OPTIONS}
              />
              <fieldset disabled={Boolean(translation)} className={"admin-form-grid admin-form-grid--two"}>
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
                disabled={Boolean(translation)}
                label={i18n.t("theme___Tipografía de títulos")}
                name={"headingFont"}
                options={HEADING_FONT_OPTIONS}
              />
              <FormSelect<ThemeFormValues>
                disabled={Boolean(translation)}
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
                disabled={Boolean(translation)}
                label={i18n.t("theme___Mostrar fotos en la carta")}
                name={"showMenuPhotos"}
              />
              <FormCheckbox<ThemeFormValues>
                disabled={Boolean(translation)}
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
