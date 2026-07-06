import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@lib/errors";
import { invalidateTranslations } from "@lib/invalidation";
import { trpc } from "@lib/trpc";

interface TranslationFieldRowProps {
  base: string | null;
  branchId: string;
  entityId: string;
  entityType: "category" | "dish" | "ingredient" | "variant_group" | "variant_option";
  field: "description" | "name";
  fieldLabel: string;
  languageCode: string;
  source: "machine" | "manual" | null;
  status: "ok" | "pending_update" | null;
  value: string | null;
}

function statusLabel(status: TranslationFieldRowProps["status"], source: TranslationFieldRowProps["source"]): string {
  if (status === "pending_update") {
    return "pendiente";
  }

  if (status === "ok") {
    return source === "manual" ? "manual" : "auto";
  }

  return "sin traducir";
}

export function TranslationFieldRow({
  base,
  branchId,
  entityId,
  entityType,
  field,
  fieldLabel,
  languageCode,
  source,
  status,
  value,
}: TranslationFieldRowProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const updateMutation = useMutation(trpc.admin.translations.update.mutationOptions());
  const isDirty = draft !== (value ?? "");

  async function handleSave() {
    setError(null);

    try {
      await updateMutation.mutateAsync({ entityId, entityType, field, languageCode, value: draft });
      await invalidateTranslations(queryClient, trpc, branchId, languageCode);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  return (
    <div className="admin-translation-row">
      <div className="admin-translation-base">
        <span className="admin-list-meta">
          {fieldLabel} · {statusLabel(status, source)}
        </span>
        <p className="admin-copy">{base || "—"}</p>
      </div>

      <div className="admin-translation-input">
        {field === "description" ? (
          <textarea onChange={(event) => setDraft(event.currentTarget.value)} rows={3} value={draft} />
        ) : (
          <input onChange={(event) => setDraft(event.currentTarget.value)} type="text" value={draft} />
        )}
        <mc-button disabled={!isDirty || updateMutation.isPending} onClick={() => void handleSave()} variant="secondary">
          {updateMutation.isPending ? "Guardando…" : "Guardar"}
        </mc-button>
      </div>

      {error ? <mc-inline-message message={error} tone="error" /> : null}
    </div>
  );
}
