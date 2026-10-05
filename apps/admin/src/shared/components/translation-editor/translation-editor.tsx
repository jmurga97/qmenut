import { Button, SearchField } from "@jmurga97/components";

import { i18n } from "~/lib/i18n";
import { FormActions } from "~/shared/components/forms/form-actions";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";

import { isHeaded, keyOf, ownerOf, toSections } from "./translation-model";
import { TranslationRow } from "./translation-row";
import {
  useSaveTranslations,
  useTranslationDrafts,
  useTranslationFilter,
  useTranslationTexts,
} from "./use-translation-editor";

import type { TextItem } from "./translation-model";
import type { ReactNode } from "react";

interface TranslationEditorProps {
  branchId: string;
  languageCode: string;
  entityId?: string;
  entityType?: TextItem["entityType"];
}
interface Section {
  id: string;
  all: TextItem[];
  shown: TextItem[];
}

const SECTION_LABELS: Record<string, string> = {
  dish: i18n.t("shared___Platos"),
  ingredient: i18n.t("shared___Extras"),
  promotion: i18n.t("shared___Promociones"),
  reward: i18n.t("shared___Recompensas"),
  branch: i18n.t("shared___Sucursal"),
};

export function TranslationEditor(props: TranslationEditorProps) {
  const { branchId, languageCode } = props;
  const canWrite = useCan("languages.write");
  const scoped = Boolean(props.entityId);
  const { items, names } = useTranslationTexts(props);
  const { drafts, change, undo, discard } = useTranslationDrafts();
  const filter = useTranslationFilter({ drafts, items, names, scoped });
  const save = useSaveTranslations({ branchId, languageCode, onSaved: discard });
  useEditorGuard({ dirty: drafts.size > 0, pending: save.isPending });

  const renderRow = (item: TextItem) => (
    <TranslationRow
      key={keyOf(item)}
      draft={drafts.get(keyOf(item))}
      item={item}
      onChange={(value) => change(item, value)}
      onUndo={() => undo(item)}
      readOnly={!canWrite || save.isPending}
    />
  );
  const sections = [...toSections(items)]
    .map(([id, all]) => ({ id, all, shown: all.filter((item) => filter.isVisible(item)) }))
    .filter((section) => section.shown.length > 0);

  return (
    <div className="admin-translation-editor">
      {languageCode === "ca-valencia" ? (
        <p className="admin-list-meta">
          {i18n.t("shared___La traducción automática usa catalán. Puedes adaptar aquí los textos al valenciano.")}
        </p>
      ) : null}
      {scoped ? (
        <div className="admin-translation-rows">{items.map((item) => renderRow(item))}</div>
      ) : (
        <>
          <TranslationToolbar filter={filter} />
          {sections.map((section) => (
            <TranslationSection key={section.id} names={names} renderRow={renderRow} section={section} />
          ))}
          {sections.length === 0 ? (
            <p className="admin-list-meta">{i18n.t("shared___No hay textos en esta selección.")}</p>
          ) : null}
        </>
      )}
      {canWrite && drafts.size > 0 ? (
        <TranslationSaveBar
          busy={save.isPending}
          count={drafts.size}
          onDiscard={discard}
          onSave={() => save.mutate({ drafts, items })}
        />
      ) : null}
    </div>
  );
}

function TranslationToolbar({ filter }: { filter: ReturnType<typeof useTranslationFilter> }) {
  const options = [
    { id: "all", label: i18n.t("shared___Todos ({{count}})", { count: filter.counts.all }) },
    { id: "pending", label: i18n.t("shared___Pendientes ({{count}})", { count: filter.counts.pending }) },
    { id: "modified", label: i18n.t("shared___Modificados ({{count}})", { count: filter.counts.modified }) },
  ] as const;
  return (
    <div className="admin-translation-toolbar">
      <SearchField
        aria-label={i18n.t("shared___Buscar texto")}
        clearLabel={i18n.t("shared___Borrar búsqueda")}
        onValueChange={filter.setSearch}
        placeholder={i18n.t("shared___Buscar texto")}
        value={filter.search}
      />
      <div className="admin-translation-filters" role="group" aria-label={i18n.t("shared___Filtrar textos")}>
        {options.map((option) => (
          <Button
            aria-pressed={filter.filter === option.id}
            key={option.id}
            onClick={() => filter.setFilter(option.id)}
            size="sm"
            variant={filter.filter === option.id ? "secondary" : "ghost"}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** A collapsible carta section; rows of the same dish, promotion or reward sit under its name. */
function TranslationSection({
  names,
  renderRow,
  section,
}: {
  names: ReadonlyMap<string, string>;
  renderRow: (item: TextItem) => ReactNode;
  section: Section;
}) {
  return (
    <details className="admin-card admin-translation-section" open>
      <summary>
        <span className="admin-translation-section-title">{SECTION_LABELS[section.id] ?? names.get(section.id)}</span>
        <span className="admin-list-meta">
          {i18n.t("shared___{{done}}/{{total}} traducidos", {
            done: section.all.filter((item) => item.complete).length,
            total: section.all.length,
          })}
        </span>
      </summary>
      {[...Map.groupBy(section.shown, (item) => ownerOf(item))].map(([owner, ownerItems]) => (
        <div className="admin-translation-rows" key={owner}>
          {isHeaded(ownerItems[0]) ? <h3 className="admin-translation-owner">{names.get(owner)}</h3> : null}
          {ownerItems.map((item) => renderRow(item))}
        </div>
      ))}
    </details>
  );
}

function TranslationSaveBar({
  busy,
  count,
  onDiscard,
  onSave,
}: {
  busy: boolean;
  count: number;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="admin-translation-savebar">
      <FormActions busy={busy} onCancel={onDiscard} onSubmit={onSave} submitLabel={i18n.t("shared___Guardar cambios")}>
        <span className="admin-form-actions__start admin-list-meta" role="status">
          {i18n.t("shared___Cambios sin guardar: {{count}}", { count })}
        </span>
      </FormActions>
    </div>
  );
}
