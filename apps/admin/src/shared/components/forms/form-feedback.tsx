import { InlineMessage } from "@jmurga97/components";

import { getErrorMessage } from "~/lib/errors";

interface FormFeedbackProps {
  error?: unknown;
  success?: string | null;
}
export function FormFeedback({ error, success }: FormFeedbackProps) {
  return (
    <>
      {error ? <InlineMessage message={getErrorMessage(error)} tone="error" /> : null}
      {success ? <InlineMessage message={success} tone="success" /> : null}
    </>
  );
}
