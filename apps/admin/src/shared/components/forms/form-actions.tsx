import { Button } from "@ming/components";

import type { ReactNode } from "react";

interface FormActionsProps {
  busy?: boolean;
  busyLabel?: string;
  children?: ReactNode;
  onCancel?: () => void;
  onSubmit: () => void;
  submitLabel?: string;
}
export function FormActions({
  busy = false,
  busyLabel = "Guardando…",
  children,
  onCancel,
  onSubmit,
  submitLabel = "Guardar",
}: FormActionsProps) {
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
        variant="primary"
      >
        {busy ? busyLabel : submitLabel}
      </Button>
    </div>
  );
}
