import { useCallback, useRef, useState } from "react";

export function useImageSave() {
  const operationRef = useRef<{ fingerprint: string; id: string }>(undefined);
  const operationIdFor = (input: unknown) => {
    const fingerprint = JSON.stringify(input);
    if (operationRef.current?.fingerprint !== fingerprint)
      operationRef.current = { fingerprint, id: crypto.randomUUID() };
    return operationRef.current.id;
  };
  const inFlightRef = useRef(false);
  const [error, setError] = useState<unknown>();
  const [pending, setPending] = useState(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setError(undefined);
    setPending(true);
    try {
      await task();
    } catch (taskError) {
      setError(taskError);
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  }, []);

  return { error, pending, run, operationIdFor };
}
