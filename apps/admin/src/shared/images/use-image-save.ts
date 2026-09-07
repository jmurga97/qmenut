import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { setEditorBusy } from "~/app/store/shell-store";

export function useImageSave() {
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
  const [error, setError] = useState<unknown>();
  const [pending, setPending] = useState(false);

  const run = useCallback(async (task: () => Promise<void>, onSettled: () => void) => {
    if (inFlightRef.current) return false;

    inFlightRef.current = true;
    setError(undefined);
    setPending(true);
    setEditorBusy(true);
    try {
      await task();
      return true;
    } catch (taskError) {
      setError(taskError);
      return false;
    } finally {
      onSettled();
      inFlightRef.current = false;
      setPending(false);
      setEditorBusy(false);
    }
  }, []);

  return { error, pending, run, operationIdFor };
}
