import { Button, InlineMessage } from "@ming/components";
import { Link } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";

import { useTranslationsController } from "~/features/languages/hooks/use-translations-controller";
import { translationStatus } from "~/features/languages/mappers";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormFeedback } from "~/shared/components/forms/form-feedback";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import type { TranslationRow, TranslationsFormValues } from "~/features/languages/types";

function TranslationField({
  busy,
  dirty,
  index,
  readOnly,
  row,
  save,
}: {
  busy: boolean;
  dirty: boolean;
  index: number;
  readOnly: boolean;
  row: TranslationRow;
  save: (index: number) => void;
}) {
  const name = `rows.${index}.value` as const;
  const label = `${row.fieldLabel} · ${translationStatus(row)}`;
  return (
    <div className="admin-translation-row">
      <div className="admin-translation-base">
        <span className="admin-list-meta">Original</span>
        <p className="admin-copy">{row.base || "—"}</p>
      </div>
      <div className="admin-translation-input">
        {row.field === "description" ? (
          <FormTextarea<TranslationsFormValues> disabled={readOnly} label={label} name={name} rows={3} />
        ) : (
          <FormTextInput<TranslationsFormValues> disabled={readOnly} label={label} name={name} />
        )}
        {readOnly ? null : (
          <Button
            aria-label={`Guardar traducción de ${row.fieldLabel}`}
            disabled={!dirty || busy}
            onClick={() => save(index)}
            variant="secondary"
          >
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        )}
      </div>
    </div>
  );
}
export function TranslationsPage({ languageCode }: { languageCode: string }) {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Selecciona una sucursal para editar sus traducciones." />;
  return <TranslationsContent branchId={branch.id} languageCode={languageCode} key={`${branch.id}:${languageCode}`} />;
}
function TranslationsContent({ branchId, languageCode }: { branchId: string; languageCode: string }) {
  const canWrite = useCan("languages.write");
  const controller = useTranslationsController(branchId, languageCode);
  const dirtyRows = controller.form.formState.dirtyFields.rows;
  const { stats } = controller.catalog;
  let translationAction = null;
  if (controller.deeplSupported && canWrite) {
    translationAction = (
      <div className="admin-toolbar">
        <Button disabled={controller.translateBusy} onClick={controller.translateMissing} variant="primary">
          {controller.translateBusy ? "Traduciendo…" : "Traducir faltantes y pendientes"}
        </Button>
      </div>
    );
  } else if (!controller.deeplSupported) {
    translationAction = (
      <InlineMessage
        message="Este idioma no está soportado por DeepL: las traducciones deben editarse manualmente."
        tone="warning"
      />
    );
  }
  return (
    <div className="admin-page">
      <PageHeader
        description={`${stats.translated}/${stats.total} traducidos · ${stats.pending} pendientes · ${stats.missing} sin traducir`}
        kicker={
          <>
            <Link className="admin-link" to="/languages">
              Idiomas
            </Link>{" "}
            / {controller.languageLabel}
          </>
        }
        title={controller.languageLabel}
      />
      {translationAction}
      <FormFeedback error={controller.error} />
      <FormProvider {...controller.form}>
        <section className="admin-card">
          {controller.fields.map((row, index) => (
            <div className="admin-translation-nested" key={row.id}>
              <div className="admin-kicker">{row.groupPath}</div>
              <TranslationField
                busy={controller.savingRow === index}
                dirty={Boolean(dirtyRows?.[index]?.value)}
                index={index}
                readOnly={!canWrite}
                row={row}
                save={controller.saveRow}
              />
            </div>
          ))}
        </section>
      </FormProvider>
    </div>
  );
}
