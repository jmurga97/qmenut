import { Button, SearchField } from "@jmurga97/components";
import { useState } from "react";

import { i18n } from "~/lib/i18n";
import { FormActions } from "~/shared/components/forms/form-actions";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";

import { isHeaded, keyOf, ownerOf, toSections } from "./translation-model";
import { TranslationRow } from "./translation-row";
import {
  useSaveTranslations,
  useToggleTranslationLock,
  useTranslationDrafts,
  useTranslationFilter,
  useTranslationTexts,
} from "./use-translation-editor";

import type { TextItem } from "./translation-model";
import type { ReactNode } from "react";

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

export function TranslationEditor({ branchId, languageCode }: { branchId: string; languageCode: string }) {
  const canWrite = useCan("languages.write");
  const { items, names } = useTranslationTexts({ branchId, languageCode });
  const { drafts, change, undo, discard } = useTranslationDrafts();
  const filter = useTranslationFilter({ drafts, items, names });
  const save = useSaveTranslations({ branchId, languageCode, onSaved: discard });
  const lock = useToggleTranslationLock({ onLocked: undo });
  const [tab, setTab] = useState<string>();
  useEditorGuard({ dirty: drafts.size > 0, pending: save.isPending });

  const renderRow = (item: TextItem) => (
    <TranslationRow
      key={keyOf(item)}
      draft={drafts.get(keyOf(item))}
      item={item}
      onChange={(value) => change(item, value)}
      onToggleLock={canWrite ? () => lock.mutate(item) : undefined}
      onUndo={() => undo(item)}
      readOnly={!canWrite || save.isPending || lock.isPending}
    />
  );
  const sections = [...toSections(items)].map(([id, all]) => ({
    id,
    all,
    shown: all.filter((item) => filter.isVisible(item)),
  }));
  const active =
    sections.find((section) => section.id === tab) ??
    sections.find((section) => section.shown.length > 0) ??
    sections[0];

  return (
    <div className="admin-translation-editor">
      {languageCode === "ca-valencia" ? (
        <p className="admin-list-meta">
          {i18n.t("shared___La traducción automática usa catalán. Puedes adaptar aquí los textos al valenciano.")}
        </p>
      ) : null}
      <TranslationToolbar filter={filter} />
      <TranslationTabs active={active?.id} names={names} onSelect={setTab} sections={sections} />
      <div aria-labelledby={active && `translation-tab-${active.id}`} role="tabpanel">
        {active && active.shown.length > 0 ? (
          <TranslationSection names={names} renderRow={renderRow} section={active} />
        ) : (
          <p className="admin-list-meta">{i18n.t("shared___No hay textos en esta selección.")}</p>
        )}
      </div>
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
    { id: "locked", label: i18n.t("shared___No se traducen ({{count}})", { count: filter.counts.locked }) },
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

/** One tab per carta section, scrolling sideways when they overflow; the count is what the filter shows. */
function TranslationTabs({
  active,
  names,
  onSelect,
  sections,
}: {
  active: string | undefined;
  names: ReadonlyMap<string, string>;
  onSelect: (id: string) => void;
  sections: Section[];
}) {
  const focus = (index: number) => {
    const next = sections[(index + sections.length) % sections.length];
    onSelect(next.id);
    document.querySelector<HTMLElement>(`[id="translation-tab-${next.id}"]`)?.focus();
  };
  return (
    <div aria-label={i18n.t("shared___Secciones")} className="admin-translation-tabs" role="tablist">
      {sections.map((section, index) => (
        <button
          aria-selected={section.id === active}
          id={`translation-tab-${section.id}`}
          key={section.id}
          onClick={() => onSelect(section.id)}
          onKeyDown={(event) => {
            const moves: Record<string, number> = {
              ArrowLeft: index - 1,
              ArrowRight: index + 1,
              End: sections.length - 1,
              Home: 0,
            };
            if (!(event.key in moves)) return;
            event.preventDefault();
            focus(moves[event.key]);
          }}
          role="tab"
          tabIndex={section.id === active ? 0 : -1}
          type="button"
        >
          {SECTION_LABELS[section.id] ?? names.get(section.id)}
          <span className="admin-translation-tab-count">{section.shown.length}</span>
        </button>
      ))}
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
