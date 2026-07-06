import { useSyncExternalStore } from "react";

function subscribeToMediaQuery(query: string, onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia(query);
  const handleChange = () => {
    onStoreChange();
  };

  mediaQuery.addEventListener("change", handleChange);

  return () => {
    mediaQuery.removeEventListener("change", handleChange);
  };
}

function getMediaQuerySnapshot(query: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToMediaQuery(query, onStoreChange),
    () => getMediaQuerySnapshot(query, fallback),
    () => fallback,
  );
}
