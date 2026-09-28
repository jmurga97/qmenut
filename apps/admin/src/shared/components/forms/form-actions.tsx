import { Button } from "@jmurga97/components";

import { i18n } from "~/lib/i18n";

import { FileOperationProgress } from "./file-operation-progress";

import type { FileOperation } from "./file-operation-progress";
import type { ReactNode } from "react";

interface FormActionsProps {
  operation?: FileOperation;
  busy?: boolean;
  busyLabel?: string;
  children?: ReactNode;
  onCancel?: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitLabel?: ReactNode;
  submitType?: "button" | "submit";
}
export function FormActions({
  operation,
  busy = false,
  busyLabel = i18n.t("shared___Guardando…"),
  children,
  onCancel,
  onSubmit,
  submitDisabled = false,
  submitLabel = i18n.t("shared___Guardar"),
  submitType = "button",
}: FormActionsProps) {
  if (operation)
    return (
      <div className="admin-form-actions">
        <FileOperationProgress operation={operation} />
      </div>
    );
  return (
    <div className="admin-form-actions">
      {children}
      {onCancel ? (
        <Button
          key={busy ? "cancel-busy" : "cancel-idle"}
          disabled={busy || undefined}
          onClick={onCancel}
          variant={"secondary"}
        >
          {i18n.t("shared___Cancelar")}
        </Button>
      ) : null}
      <Button
        key={busy ? "submit-busy" : "submit-idle"}
        disabled={busy || submitDisabled || undefined}
        onClick={submitType === "submit" ? undefined : onSubmit}
        type={submitType}
        variant={"primary"}
      >
        {busy ? busyLabel : submitLabel}
      </Button>
    </div>
  );
}
