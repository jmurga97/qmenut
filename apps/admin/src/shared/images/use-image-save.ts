import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { notifyError } from "~/lib/notifications";
import { setEditorBusy } from "~/shared/stores/shell-store";

export function useImageSave() {
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19 useRef requires an explicit initial value.
  const operationRef = useRef<{ fingerprint: string; id: string }>(undefined);
  const operationIdFor = (input: unknown) => {
    const fingerprint = JSON.stringify(input);
    if (operationRef.current?.fingerprint !== fingerprint)
      operationRef.current = { fingerprint, id: crypto.randomUUID() };
    return operationRef.current.id;
  };
  const inFlightRef = useRef(false);
  useBlocker({ shouldBlockFn: () => inFlightRef.current, enableBeforeUnload: () => inFlightRef.current });
  useEffect(() => () => setEditorBusy(false), []);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (task: () => Promise<void>, onSettled: () => void) => {
    if (inFlightRef.current) return false;

    inFlightRef.current = true;
    setPending(true);
    setEditorBusy(true);
    try {
      await task();
      return true;
    } catch (taskError) {
      notifyError(taskError);
      return false;
    } finally {
      onSettled();
      inFlightRef.current = false;
      setPending(false);
      setEditorBusy(false);
    }
  }, []);

  return { pending, run, operationIdFor };
}
