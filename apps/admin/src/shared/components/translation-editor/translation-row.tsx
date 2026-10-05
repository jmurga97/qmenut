import { Button, Textarea } from "@jmurga97/components";

import { i18n } from "~/lib/i18n";

import { HEADED_TYPES, storedValue } from "./translation-model";

import type { TextItem } from "./translation-model";

const ENTITY_LABELS: Record<string, string> = {
  category: i18n.t("shared___Categoría"),
  dish: i18n.t("shared___Plato"),
  ingredient: i18n.t("shared___Extra"),
  variant_group: i18n.t("shared___Grupo de variantes"),
  variant_option: i18n.t("shared___Variante"),
  promotion: i18n.t("shared___Promoción"),
  branch: i18n.t("shared___Sucursal"),
  reward: i18n.t("shared___Recompensa"),
};
const FIELD_LABELS: Record<string, string> = {
  comboDescription: i18n.t("shared___Descripción del combo"),
  description: i18n.t("shared___Descripción"),
  name: i18n.t("shared___Nombre"),
  tagline: i18n.t("shared___Eslogan"),
};
const STATUS_LABELS = {
  modified: i18n.t("shared___Modificado"),
  pending: i18n.t("shared___Pendiente"),
};

/** Unsaved edits win; otherwise a text missing or outdated in this language is pending. */
function rowState(item: TextItem, draft: string | undefined) {
  if (draft !== undefined) return "modified";
  return item.complete ? undefined : "pending";
}

export function TranslationRow({
  draft,
  item,
  onChange,
  onUndo,
  readOnly,
}: {
  draft: string | undefined;
  item: TextItem;
  onChange: (value: string) => void;
  onUndo: () => void;
  readOnly: boolean;
}) {
  const label =
    item.field === "name" && !HEADED_TYPES.has(item.entityType)
      ? ENTITY_LABELS[item.entityType]
      : FIELD_LABELS[item.field];
  const state = rowState(item, draft);
  const status =
    state === "pending" && item.isManual ? i18n.t("shared___El original cambió") : state && STATUS_LABELS[state];
  const action =
    state === "modified"
      ? { label: i18n.t("shared___Deshacer"), run: onUndo }
      : { label: i18n.t("shared___Confirmar"), run: () => onChange(storedValue(item)) };
  return (
    <div className="admin-translation-row" data-indent={item.dishId ? true : undefined} data-state={state}>
      <div className="admin-translation-label">
        <span>{label}</span>
        {status ? <span className="admin-translation-status">{status}</span> : null}
      </div>
      <p className="admin-translation-source">{item.text}</p>
      <div className="admin-translation-input">
        <Textarea
          aria-label={`${label}: ${item.text}`}
          className="admin-translation-textarea"
          onValueChange={onChange}
          readOnly={readOnly}
          rows={1}
          value={draft ?? storedValue(item)}
        />
        {readOnly || !state ? null : (
          <Button onClick={action.run} size="sm" variant="ghost">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
