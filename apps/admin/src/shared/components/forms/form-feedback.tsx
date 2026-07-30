import { getErrorMessage } from "~/lib/errors";

interface FormFeedbackProps {
  error?: unknown;
  success?: string | null;
}
export function FormFeedback({ error, success }: FormFeedbackProps) {
  return (
    <>
      {error ? <mc-inline-message message={getErrorMessage(error)} tone="error" /> : null}
      {success ? <mc-inline-message message={success} tone="success" /> : null}
    </>
  );
}
