import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { isUsableVesExchangeRate } from "~/shared/lib/price-formatter";

import type { QmLangOption } from "@qmenut/ui/components/qm-lang";

const CHOICE_STORAGE_KEY = "qm-currency-choice";

// The stored choice is the only real state; the displayed currency is derived from it, so it lives
// in localStorage and is read through useSyncExternalStore: no hydration mismatch (the server
// snapshot is null) and no setState-in-effect cascade when the tenant turns VES prices off.
const choiceListeners = new Set<() => void>();

function subscribeChoice(onChange: () => void): () => void {
  choiceListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    choiceListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function storeChoice(value: string): void {
  window.localStorage.setItem(CHOICE_STORAGE_KEY, value);
  for (const onChange of choiceListeners) onChange();
}

interface UsePublicCurrencyInput {
  sourceCurrency: string;
  vesExchangeRate: string | null;
  vesPricesEnabled: boolean;
}

export interface PublicCurrencyState {
  currencyLabel: string;
  currencyOptions: QmLangOption[];
  displayCurrency: string;
  handleCurrencyChange: (event: CustomEvent<{ value: string }>) => void;
}

export function usePublicCurrency({
  sourceCurrency,
  vesExchangeRate,
  vesPricesEnabled,
}: UsePublicCurrencyInput): PublicCurrencyState {
  const { t } = useTranslation();
  const canDisplayVes = sourceCurrency === "USD" && vesPricesEnabled && isUsableVesExchangeRate(vesExchangeRate);
  const storedChoice = useSyncExternalStore(
    subscribeChoice,
    () => window.localStorage.getItem(CHOICE_STORAGE_KEY),
    () => null,
  );
  const displayCurrency = canDisplayVes && storedChoice === "VES" ? "VES" : sourceCurrency;
  const currencyOptions = useMemo(
    () =>
      canDisplayVes
        ? [
            { value: sourceCurrency, label: sourceCurrency },
            { value: "VES", label: "VES" },
          ]
        : [],
    [canDisplayVes, sourceCurrency],
  );

  const handleCurrencyChange = useCallback(
    (event: CustomEvent<{ value: string }>) => {
      storeChoice(event.detail.value === "VES" && canDisplayVes ? "VES" : sourceCurrency);
    },
    [canDisplayVes, sourceCurrency],
  );

  const currencyLabel = t("common.currencyLabel");

  return useMemo(
    () => ({
      currencyLabel,
      currencyOptions,
      displayCurrency,
      handleCurrencyChange,
    }),
    [currencyLabel, currencyOptions, displayCurrency, handleCurrencyChange],
  );
}
