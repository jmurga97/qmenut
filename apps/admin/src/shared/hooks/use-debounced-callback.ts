import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<TValue>(callback: (value: TValue) => void, delay: number) {
  const callbackRef = useRef(callback);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19 useRef requires an explicit initial value.
  const timeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    callbackRef.current = callback;
  });
  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);
  return useCallback(
    (value: TValue) => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => callbackRef.current(value), delay);
    },
    [delay],
  );
}
