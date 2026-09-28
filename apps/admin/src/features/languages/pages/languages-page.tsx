import { ConfirmAction, DropdownMenu } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { Suspense, useState } from "react";
import { FormProvider } from "react-hook-form";

import { useLanguagesController } from "~/features/languages/hooks/use-languages-controller";
import { i18n } from "~/lib/i18n";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormActions } from "~/shared/components/forms/form-actions";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { TranslationEditor } from "~/shared/components/translation-editor";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedLanguage } from "~/shared/hooks/use-selected-language";
import { useLanguageStore } from "~/shared/stores/language-store";

import type { AddLanguageFormValues } from "~/features/languages/types";

export function LanguagesPage() {
  const canWrite = useCan("languages.write");
  const controller = useLanguagesController();
  const selectedLanguage = useSelectedLanguage();
  const selectLanguage = useLanguageStore((state) => state.setSelectedLanguageCode);
  const [retranslating, setRetranslating] = useState<string | null>(null);
  return (
    <div className={"ming-page admin-page admin-languages-page"}>
      <PageHeader
        kicker={i18n.t("languages___Idiomas")}
        title={i18n.t("languages___Idiomas")}
        description={i18n.t(
          "languages___Añadir un idioma traduce el contenido de todas las sucursales. Solo se publica cuando todos los textos están completos. Selecciona un idioma para editar sus traducciones.",
        )}
      />
      <div className="admin-languages-workspace">
        <EntityListCard
          action={null}
          count={controller.languages.length}
          emptyText={i18n.t("languages___Aún no hay idiomas configurados.")}
          title={i18n.t("languages___Idiomas disponibles")}
        >
          {controller.languages.map((language) => {
            const entry = controller.catalog.find(({ code }) => code === language.languageCode);
            const busy = controller.pendingCode === language.languageCode;
            const status = language.ready
              ? i18n.t("languages___Publicado")
              : i18n.t("languages___{{count}} textos pendientes · Sin publicar", { count: language.missing });
            return (
              <li className="admin-list-item" key={language.languageCode}>
                <span className="admin-list-label">{entry?.label ?? language.languageCode.toUpperCase()}</span>
                <span className="admin-list-meta">
                  {language.isDefault ? i18n.t("languages___Por defecto") : status}
                </span>
                {language.isDefault || !canWrite ? null : (
                  <DropdownMenu
                    align={"end"}
                    ariaLabel={i18n.t("languages___Acciones para {{language}}", {
                      language: entry?.label ?? language.languageCode,
                    })}
                    className={buttonVariants({ size: "sm", variant: "secondary" })}
                    disabled={busy}
                    items={[
                      {
                        id: "edit",
                        label: i18n.t("languages___Editar traducciones"),
                        onSelect: () => selectLanguage(language.languageCode),
                      },
                      {
                        id: "complete",
                        label: i18n.t("languages___Completar traducciones"),
                        onSelect: () => controller.act(language.languageCode, "complete"),
                      },
                      ...(entry?.translatable
                        ? [
                            {
                              id: "translate",
                              label: <>{i18n.t("languages___Retraducir contenido")}</>,
                              textValue: i18n.t("languages___Retraducir contenido"),
                              onSelect: () => setRetranslating(language.languageCode),
                            },
                          ]
                        : []),
                      {
                        id: "remove",
                        label: <>{i18n.t("languages___Eliminar")}</>,
                        textValue: i18n.t("languages___Eliminar"),
                        onSelect: () => controller.act(language.languageCode, "remove"),
                        separatorBefore: true,
                        tone: "destructive",
                      },
                    ]}
                    trigger={busy ? i18n.t("languages___Procesando…") : i18n.t("languages___Acciones")}
                  />
                )}
              </li>
            );
          })}
        </EntityListCard>
        {canWrite && controller.options.length > 0 ? (
          <section className={"admin-card admin-language-add"}>
            <div className="admin-kicker">{i18n.t("languages___Añadir idioma")}</div>
            <FormProvider {...controller.form}>
              <div className="admin-form-grid">
                <FormSelect<AddLanguageFormValues>
                  label={i18n.t("languages___Idioma")}
                  name={"languageCode"}
                  options={controller.options}
                />
              </div>
              <FormActions
                busy={controller.addBusy}
                busyLabel={i18n.t("languages___Traduciendo…")}
                onSubmit={() => void controller.form.handleSubmit(controller.add)()}
                submitLabel={<>{i18n.t("languages___Añadir y traducir")}</>}
              />
            </FormProvider>
          </section>
        ) : null}
      </div>
      {controller.branch && !selectedLanguage.isDefault && selectedLanguage.languageCode ? (
        <Suspense fallback={<CardSkeleton rows={6} />} key={`${controller.branch.id}:${selectedLanguage.languageCode}`}>
          <TranslationEditor branchId={controller.branch.id} languageCode={selectedLanguage.languageCode} />
        </Suspense>
      ) : null}
      {retranslating ? (
        <ConfirmAction
          cancelLabel={i18n.t("languages___Cancelar")}
          confirmLabel={i18n.t("languages___Retraducir")}
          message={i18n.t(
            "languages___Se retraducirán todos los textos de todas las sucursales en este idioma. También se sobrescribirán tus correcciones manuales. Para conservarlas, usa Completar traducciones.",
          )}
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
          title={i18n.t("languages___¿Retraducir todo el contenido?")}
        />
      ) : null}
    </div>
  );
}
