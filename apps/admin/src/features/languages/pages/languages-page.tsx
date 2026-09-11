import { ConfirmAction, DropdownMenu } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { useState } from "react";
import { FormProvider } from "react-hook-form";

import { useLanguagesController } from "~/features/languages/hooks/use-languages-controller";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormActions } from "~/shared/components/forms/form-actions";
import { FormFeedback } from "~/shared/components/forms/form-feedback";
import { Icon } from "~/shared/components/icon";
import { PageHeader } from "~/shared/components/page-header";
import { useCan } from "~/shared/hooks/use-can";

import type { AddLanguageFormValues } from "~/features/languages/types";

export function LanguagesPage() {
  const canWrite = useCan("languages.write");
  const controller = useLanguagesController();
  const [retranslating, setRetranslating] = useState<string | null>(null);
  return (
    <div className="admin-page admin-languages-page">
      <PageHeader
        kicker="Idiomas"
        title="Idiomas"
        description={
          controller.branch
            ? `Retraduce el contenido de ${controller.branch.name} desde las opciones de cada idioma.`
            : "Selecciona una sucursal para retraducir su contenido."
        }
      />
      <div className="admin-languages-workspace">
        <EntityListCard
          action={null}
          count={controller.languages.length}
          emptyText="Aún no hay idiomas configurados."
          title="Idiomas disponibles"
        >
          {controller.languages.map((language) => {
            const entry = controller.catalog.find(({ code }) => code === language.languageCode);
            const busy = controller.pendingCode === language.languageCode;
            return (
              <li className="admin-list-item" key={language.languageCode}>
                <span className="admin-list-label">{entry?.label ?? language.languageCode.toUpperCase()}</span>
                <span className="admin-list-meta">{language.isDefault ? "Por defecto" : ""}</span>
                {language.isDefault || !canWrite ? null : (
                  <DropdownMenu
                    align="end"
                    ariaLabel={`Acciones para ${entry?.label ?? language.languageCode}`}
                    className={buttonVariants({ size: "sm", variant: "secondary" })}
                    disabled={busy}
                    items={[
                      ...(entry && controller.branch
                        ? [
                            {
                              id: "translate",
                              label: (
                                <>
                                  <Icon name="refresh" /> Retraducir contenido
                                </>
                              ),
                              textValue: "Retraducir contenido",
                              onSelect: () => setRetranslating(language.languageCode),
                            },
                          ]
                        : []),
                      {
                        id: "remove",
                        label: (
                          <>
                            <Icon name="trash" /> Eliminar
                          </>
                        ),
                        textValue: "Eliminar",
                        onSelect: () => controller.act(language.languageCode, "remove"),
                        separatorBefore: true,
                        tone: "destructive",
                      },
                    ]}
                    trigger={busy ? "Procesando…" : "Acciones"}
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
              </div>
              <FormActions
                busy={controller.addBusy}
                busyLabel="Añadiendo…"
                onSubmit={() => void controller.form.handleSubmit(controller.add)()}
                submitLabel={
                  <>
                    <Icon name="plus" /> Añadir idioma
                  </>
                }
              />
            </FormProvider>
          </section>
        ) : null}
      </div>
      <FormFeedback error={controller.error} />
      {retranslating ? (
        <ConfirmAction
          cancelLabel="Cancelar"
          confirmLabel="Retraducir"
          message={`Se retraducirán todos los textos de ${controller.branch?.name} en este idioma. Se sobrescribirán las traducciones existentes. Los extras compartidos se actualizarán en todas las sucursales que los usan.`}
          onCancel={() => setRetranslating(null)}
          onConfirm={() => {
            const language = controller.languages.find(({ languageCode }) => languageCode === retranslating);
            if (language) controller.act(language.languageCode, "translate");
            setRetranslating(null);
          }}
          onOpenChange={(open) => {
            if (!open) setRetranslating(null);
          }}
          open
          title="¿Retraducir todo el contenido?"
        />
      ) : null}
    </div>
  );
}
