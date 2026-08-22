import { useCallback, useRef, useState } from "react";

export function useImageSave() {
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

  return { error, pending, run };
}
