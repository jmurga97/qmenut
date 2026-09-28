import { Field, Input, Textarea } from "@jmurga97/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { FormShell } from "~/shared/components/forms/form-shell";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";

import type { RouterOutputs } from "~/lib/trpc";

interface TranslationEditorProps {
  branchId: string;
  languageCode: string;
  entityId?: string;
  entityType?: TextItem["entityType"];
}

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

export function TranslationEditor({ branchId, languageCode, entityId, entityType }: TranslationEditorProps) {
  const { data: rows } = useSuspenseQuery(trpc.admin.translations.list.queryOptions({ branchId, languageCode }));
  const [search, setSearch] = useState("");
  const groups = Map.groupBy(
    rows.filter((row) => (!entityId || row.entityId === entityId) && (!entityType || row.entityType === entityType)),
    (row) => row.entityId,
  );
  return (
    <div className={"ming-stack ming-stack--loose"}>
      <p>
        {i18n.t("shared___Textos en")} {languageCode.toUpperCase()}
        {i18n.t("shared___. Guardar modifica únicamente esta traducción.")}
      </p>
      {languageCode === "ca-valencia" ? (
        <p>{i18n.t("shared___La traducción automática usa catalán. Puedes adaptar aquí los textos al valenciano.")}</p>
      ) : null}
      {entityId ? null : (
        <Field label={i18n.t("shared___Buscar texto")} optionalLabel={i18n.t("shared___Optional")}>
          <Input value={search} onValueChange={setSearch} />
        </Field>
      )}
      {[...groups]
        .filter(([, items]) =>
          items.some((item) => `${item.text} ${item.value}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
        )
        .map(([id, items]) => (
          <TranslationGroup
            key={`${languageCode}:${id}:${JSON.stringify(items)}`}
            branchId={branchId}
            languageCode={languageCode}
            items={items}
          />
        ))}
      {groups.size === 0 ? <p>{i18n.t("shared___No hay textos editables en esta selección.")}</p> : null}
    </div>
  );
}

type TextItem = RouterOutputs["admin"]["translations"]["list"][number];

function TranslationGroup({
  branchId,
  languageCode,
  items,
}: {
  branchId: string;
  languageCode: string;
  items: TextItem[];
}) {
  const canWrite = useCan("languages.write");
  const queryClient = useQueryClient();
  const [values, setValues] = useState(items.map((item) => item.value || item.text));
  const save = useMutation(
    trpc.admin.translations.save.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.admin.translations.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.admin.languages.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.admin.menu.pathKey() }),
        ]);
        toast.success(i18n.t("shared___Traducción guardada."));
      },
    }),
  );
  useEditorGuard({
    dirty: values.some((value, index) => value !== (items[index].value || items[index].text)),
    pending: save.isPending,
  });
  const title = items.find((item) => item.field === "name")?.text ?? ENTITY_LABELS[items[0].entityType];
  function changeValue(index: number, value: string) {
    setValues((current) => current.map((previous, position) => (position === index ? value : previous)));
  }
  function submit() {
    const rows = items.flatMap((item, index) =>
      values[index] === item.value && item.complete
        ? []
        : [
            {
              entityId: item.entityId,
              entityType: item.entityType,
              field: item.field,
              sourceText: item.text,
              value: values[index],
            },
          ],
    );
    if (rows.length === 0) return;
    save.mutate({ branchId, languageCode, rows });
  }
  return (
    <section className="admin-card">
      <div className="admin-kicker">{ENTITY_LABELS[items[0].entityType]}</div>
      <h2>{title}</h2>
      <FormShell
        readOnly={!canWrite}
        busy={save.isPending}
        submitLabel={i18n.t("shared___Guardar traducción")}
        onSubmit={submit}
      >
        <div className="admin-form-grid">
          {items.map((item, index) => (
            <div key={item.field}>
              <p className="admin-list-meta">
                {FIELD_LABELS[item.field]} {i18n.t("shared___original")}
              </p>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {item.text || i18n.t("shared___Sin texto")}
              </p>
              <Field
                optionalLabel={i18n.t("shared___Optional")}
                label={i18n.t("shared___{{field}} ({{language}})", {
                  field: FIELD_LABELS[item.field],
                  language: languageCode.toUpperCase(),
                })}
              >
                <Textarea
                  disabled={save.isPending || !item.text.trim()}
                  rows={item.field === "description" || item.field === "comboDescription" ? 4 : 2}
                  value={values[index]}
                  onChange={(event) => changeValue(index, event.target.value)}
                />
              </Field>
              {item.complete ? null : (
                <p role={"status"}>
                  {item.isManual
                    ? i18n.t("shared___El original cambió. Revisa y guarda tu traducción.")
                    : i18n.t("shared___Pendiente de traducción o actualización.")}
                </p>
              )}
            </div>
          ))}
        </div>
      </FormShell>
    </section>
  );
}
