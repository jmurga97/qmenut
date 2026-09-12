import { FormActions } from "./form-actions";

import type { FileOperation } from "./file-operation-progress";
import type { ReactNode } from "react";

interface FormShellProps {
  operation?: FileOperation;
  actions?: ReactNode;
  busy?: boolean;
  busyLabel?: string;
  children: ReactNode;
  onCancel?: () => void;
  onSubmit: () => void;
  readOnly?: boolean;
  submitLabel?: ReactNode;
}
export function FormShell({ actions, children, readOnly = false, ...formActions }: FormShellProps) {
  return (
    <div className="admin-editor-shell">
      <fieldset
        className="admin-editor-fields"
        disabled={readOnly || Boolean(formActions.operation)}
        inert={readOnly || Boolean(formActions.operation)}
      >
        {children}
      </fieldset>
      {readOnly ? null : <FormActions {...formActions}>{actions}</FormActions>}
    </div>
  );
}
