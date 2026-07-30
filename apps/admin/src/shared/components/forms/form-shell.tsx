import { FormActions } from "./form-actions";
import { FormFeedback } from "./form-feedback";

import type { ReactNode } from "react";

interface FormShellProps {
  actions?: ReactNode;
  busy?: boolean;
  busyLabel?: string;
  children: ReactNode;
  error?: unknown;
  onCancel?: () => void;
  onSubmit: () => void;
  readOnly?: boolean;
  submitLabel?: string;
  success?: string | null;
}
export function FormShell({ actions, children, error, readOnly = false, success, ...formActions }: FormShellProps) {
  return (
    <div className="admin-editor-shell">
      {readOnly ? (
        <fieldset disabled inert>
          {children}
        </fieldset>
      ) : (
        children
      )}
      <FormFeedback error={error} success={success} />
      {readOnly ? null : <FormActions {...formActions}>{actions}</FormActions>}
    </div>
  );
}
