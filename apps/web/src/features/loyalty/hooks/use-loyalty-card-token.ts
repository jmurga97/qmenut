import { useCallback } from "react";

import { useStoredString } from "~/shared/hooks/use-stored-string";

interface LoyaltyCardTokenState {
  clearToken: () => void;
  setToken: (token: string) => void;
  token: string | null;
}

export function useLoyaltyCardToken(host: string): LoyaltyCardTokenState {
  const { value, setValue } = useStoredString(`qm-loyalty-card:${host}`);

  return {
    clearToken: useCallback(() => setValue(null), [setValue]),
    setToken: setValue,
    token: value,
  };
}
