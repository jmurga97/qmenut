import { toast } from "sonner";

import { getErrorMessage } from "./errors";

const shownErrors = new WeakSet<object>();

export function notifyError(error: unknown): void {
  if (typeof error === "object" && error !== null) {
    if (shownErrors.has(error)) return;
    shownErrors.add(error);
  }

  toast.error(getErrorMessage(error));
}
