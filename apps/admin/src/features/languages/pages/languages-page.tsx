import { DropdownMenu, InlineMessage } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { Link } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";

import { useLanguagesController } from "~/features/languages/hooks/use-languages-controller";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormActions } from "~/shared/components/forms/form-actions";
import { FormFeedback } from "~/shared/components/forms/form-feedback";
import { PageHeader } from "~/shared/components/page-header";
import { useCan } from "~/shared/hooks/use-can";

import type { AddLanguageFormValues } from "~/features/languages/types";

function languageStatus(language: { isActive: boolean; isDefault: boolean }) {
  if (language.isDefault) return "por defecto";
  return language.isActive ? "activa" : "oculta";
}

function isAddLanguageOutcome(outcome: string | null): outcome is "failed" | "unavailable" | "unsupported" {
  return ["failed", "unavailable", "unsupported"].includes(outcome ?? "");
}

function AddLanguageOutcome({ outcome }: { outcome: "failed" | "unavailable" | "unsupported" }) {
  if (outcome === "unsupported") {
    return (
      <InlineMessage
        message="El idioma se añadió, pero DeepL no lo admite. Las traducciones deben editarse manualmente."
        title="Idioma añadido sin traducción automática"
        tone="warning"
      />
    );
  }

  const unavailable = outcome === "unavailable";
  return (
    <InlineMessage
      message={
        unavailable
          ? "El idioma se añadió, pero DeepL no está configurado. Puedes traducirlo manualmente."
          : "El idioma se añadió, pero DeepL no pudo completar la traducción. Puedes reintentarlo desde Acciones."
      }
      title={unavailable ? "Traducción automática no disponible" : "La traducción automática falló"}
      tone="error"
    />
  );
}

export function LanguagesPage() {
  const canWrite = useCan("languages.write");
  const controller = useLanguagesController();
  return (
    <div className="admin-page admin-languages-page">
      <PageHeader kicker="Idiomas" title="Idiomas" />
      <div className="admin-languages-workspace">
        <EntityListCard
          action={null}
          count={controller.languages.length}
          emptyText="Aún no hay idiomas configurados."
          title="Activos"
        >
          {controller.languages.map((language) => {
            const entry = controller.catalog.find(({ code }) => code === language.languageCode);
            const busy = controller.pendingCode === language.languageCode;
            return (
              <li className="admin-list-item" key={language.languageCode}>
                <Link
                  className="admin-link admin-list-label"
                  params={{ languageCode: language.languageCode }}
                  to="/languages/$languageCode"
                >
                  {entry?.label ?? language.languageCode.toUpperCase()}
                </Link>
                <span className="admin-list-meta">
                  {languageStatus(language)}
                  {entry?.deeplSupported === false ? " · solo manual" : ""}
                </span>
                {language.isDefault || !canWrite ? null : (
                  <DropdownMenu
                    align="end"
                    ariaLabel={`Acciones para ${entry?.label ?? language.languageCode}`}
                    className={buttonVariants({ size: "sm", variant: "secondary" })}
                    disabled={busy}
                    items={[
                      {
                        id: "toggle",
                        label: language.isActive ? "Ocultar" : "Activar",
                        onSelect: () => controller.act(language, "toggle"),
                      },
                      ...(entry?.deeplSupported
                        ? [
                            {
                              id: "translate",
                              label: "Traducir todo",
                              onSelect: () => controller.act(language, "translate"),
                            },
                          ]
                        : []),
                      {
                        id: "remove",
                        label: "Eliminar",
                        onSelect: () => controller.act(language, "remove"),
                        separatorBefore: true,
                        tone: "destructive",
                      },
                    ]}
                    trigger="Acciones"
                  />
                )}
              </li>
            );
          })}
        </EntityListCard>
        {canWrite && controller.options.length > 0 ? (
          <section className="admin-card admin-language-add">
            <div className="admin-kicker">Añadir idioma</div>
            <FormProvider {...controller.form}>
              <div className="admin-form-grid">
                <FormSelect<AddLanguageFormValues> label="Idioma" name="languageCode" options={controller.options} />
                <FormCheckbox<AddLanguageFormValues> label="Traducir automáticamente al añadir" name="autoTranslate" />
              </div>
              <FormActions
                busy={controller.addBusy}
                busyLabel="Añadiendo…"
                onSubmit={() => void controller.form.handleSubmit(controller.add)()}
                submitLabel="Añadir idioma"
              />
            </FormProvider>
          </section>
        ) : null}
      </div>
      <FormFeedback error={controller.error} />
      {isAddLanguageOutcome(controller.addOutcome) ? <AddLanguageOutcome outcome={controller.addOutcome} /> : null}
    </div>
  );
}
