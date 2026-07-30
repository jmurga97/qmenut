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
        <mc-button disabled={busy} onClick={onCancel} variant="secondary">
          Cancelar
        </mc-button>
      ) : null}
      <mc-button disabled={busy} onClick={onSubmit} variant="primary">
        {busy ? busyLabel : submitLabel}
      </mc-button>
    </div>
  );
}
