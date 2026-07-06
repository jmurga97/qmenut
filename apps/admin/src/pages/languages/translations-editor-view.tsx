import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@components/empty-state";
import { getErrorMessage } from "@lib/errors";
import { trpc } from "@lib/trpc";
import { useSelectedBranch } from "@lib/use-selected-branch";

import { TranslationFieldRow } from "./translation-field-row";

import type { TranslationsCatalog } from "@lib/api-types";

interface TranslationsEditorViewProps {
  languageCode: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  description: "Descripción",
};

export function TranslationsEditorView({ languageCode }: TranslationsEditorViewProps) {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <EmptyState title="Sin sucursal" description="Selecciona una sucursal para editar sus traducciones." />
      </div>
    );
  }

  return <TranslationsEditorContent branchId={branch.id} languageCode={languageCode} />;
}

function EntityFields({
  branchId,
  entity,
  languageCode,
}: {
  branchId: string;
  // Structural minimum shared by categories/dishes/variant groups/options/ingredients —
  // callers pass entities with extra nested fields (dishes, variantGroups, options).
  entity: TranslationsCatalog["ingredients"][number];
  languageCode: string;
}) {
  return (
    <>
      {entity.fields.map((field) => (
        <TranslationFieldRow
          base={field.base}
          branchId={branchId}
          entityId={entity.entityId}
          entityType={entity.entityType}
          field={field.field}
          fieldLabel={FIELD_LABELS[field.field] ?? field.field}
          key={`${entity.entityId}:${field.field}`}
          languageCode={languageCode}
          source={field.source}
          status={field.status}
          value={field.value}
        />
      ))}
    </>
  );
}

function TranslationsEditorContent({ branchId, languageCode }: { branchId: string; languageCode: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data: catalogEntries } = useSuspenseQuery(trpc.admin.languages.catalog.queryOptions());
  const { data: catalog } = useSuspenseQuery(
    trpc.admin.translations.list.queryOptions({ branchId, languageCode }),
  );
  const translateAllMutation = useMutation(trpc.admin.translations.translateAll.mutationOptions());

  const languageLabel = catalogEntries.find((entry) => entry.code === languageCode)?.label ?? languageCode.toUpperCase();
  const deeplSupported = catalogEntries.find((entry) => entry.code === languageCode)?.deeplSupported ?? false;

  async function handleTranslateMissing() {
    setError(null);

    try {
      await translateAllMutation.mutateAsync({ languageCode, onlyMissing: true });
      await queryClient.invalidateQueries({
        queryKey: trpc.admin.translations.list.queryKey({ branchId, languageCode }),
      });
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">
          <Link className="admin-link" to="/languages">
            Idiomas
          </Link>{" "}
          / {languageLabel}
        </div>
        <h2>{languageLabel}</h2>
        <p>
          {catalog.stats.translated}/{catalog.stats.total} traducidos · {catalog.stats.pending} pendientes ·{" "}
          {catalog.stats.missing} sin traducir
        </p>
      </header>

      {deeplSupported ? (
        <div className="admin-toolbar">
          <mc-button disabled={translateAllMutation.isPending} onClick={() => void handleTranslateMissing()} variant="primary">
            {translateAllMutation.isPending ? "Traduciendo…" : "Traducir faltantes y pendientes"}
          </mc-button>
        </div>
      ) : (
        <mc-inline-message
          message="Este idioma no está soportado por DeepL: las traducciones deben editarse manualmente."
          tone="idle"
        />
      )}

      {error ? <mc-inline-message message={error} tone="error" /> : null}

      {catalog.categories.map((category) => (
        <section className="admin-card" key={category.entityId}>
          <div className="admin-toolbar">
            <div className="admin-kicker">Categoría</div>
          </div>
          <EntityFields branchId={branchId} entity={category} languageCode={languageCode} />

          {category.dishes.map((dish) => (
            <div className="admin-translation-nested" key={dish.entityId}>
              <div className="admin-toolbar">
                <div className="admin-kicker">Plato</div>
              </div>
              <EntityFields branchId={branchId} entity={dish} languageCode={languageCode} />

              {dish.variantGroups.map((group) => (
                <div className="admin-translation-nested" key={group.entityId}>
                  <div className="admin-toolbar">
                    <div className="admin-kicker">Grupo de variantes</div>
                  </div>
                  <EntityFields branchId={branchId} entity={group} languageCode={languageCode} />

                  {group.options.map((option) => (
                    <div className="admin-translation-nested" key={option.entityId}>
                      <EntityFields branchId={branchId} entity={option} languageCode={languageCode} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}

      {catalog.ingredients.length > 0 ? (
        <section className="admin-card">
          <div className="admin-toolbar">
            <div className="admin-kicker">Ingredientes ({catalog.ingredients.length})</div>
          </div>
          {catalog.ingredients.map((ingredient) => (
            <EntityFields branchId={branchId} entity={ingredient} key={ingredient.entityId} languageCode={languageCode} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
