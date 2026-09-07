import { Button } from "@jmurga97/components";

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
  submitLabel?: string;
  submitType?: "button" | "submit";
}
export function FormActions({
  operation,
  busy = false,
  busyLabel = "Guardando…",
  children,
  onCancel,
  onSubmit,
  submitLabel = "Guardar",
  submitType = "button",
}: FormActionsProps) {
  if (operation)
    return (
      <div className="admin-topbar-actions">
        <FileOperationProgress operation={operation} />
      </div>
    );
  return (
    <div className="admin-topbar-actions">
      {children}
      {onCancel ? (
        <Button
          key={busy ? "cancel-busy" : "cancel-idle"}
          disabled={busy || undefined}
          onClick={onCancel}
          variant="secondary"
        >
          Cancelar
        </Button>
      ) : null}
      <Button
        key={busy ? "submit-busy" : "submit-idle"}
        disabled={busy || undefined}
        onClick={onSubmit}
        type={submitType}
        variant="primary"
      >
        {busy ? busyLabel : submitLabel}
      </Button>
    </div>
  );
}
