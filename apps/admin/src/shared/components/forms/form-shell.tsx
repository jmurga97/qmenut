import { FormActions } from "./form-actions";
import { FormFeedback } from "./form-feedback";

import type { FileOperation } from "./file-operation-progress";
import type { ReactNode } from "react";

interface FormShellProps {
  operation?: FileOperation;
  actions?: ReactNode;
  busy?: boolean;
  busyLabel?: string;
  children: ReactNode;
  error?: unknown;
  onCancel?: () => void;
  onSubmit: () => void;
  readOnly?: boolean;
  submitLabel?: ReactNode;
  success?: string | null;
}
export function FormShell({ actions, children, error, readOnly = false, success, ...formActions }: FormShellProps) {
  return (
    <div className="admin-editor-shell">
      <fieldset
        className="admin-editor-fields"
        disabled={readOnly || Boolean(formActions.operation)}
        inert={readOnly || Boolean(formActions.operation)}
      >
        {children}
      </fieldset>
      <FormFeedback error={formActions.busy ? undefined : error} success={formActions.busy ? null : success} />
      {readOnly ? null : <FormActions {...formActions}>{actions}</FormActions>}
    </div>
  );
}
