import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<TValue>(callback: (value: TValue) => void, delay: number) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<number | undefined>(undefined);
  callbackRef.current = callback;
  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);
  return useCallback(
    (value: TValue) => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => callbackRef.current(value), delay);
    },
    [delay],
  );
}
