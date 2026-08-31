import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { isUsableVesExchangeRate } from "~/shared/lib/price-formatter";

import type { QmLangOption } from "@qmenut/ui/components/qm-lang";

const CHOICE_STORAGE_KEY = "qm-currency-choice";

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
  const [displayCurrency, setDisplayCurrency] = useState(sourceCurrency);
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

  useEffect(() => {
    const stored = window.localStorage.getItem(CHOICE_STORAGE_KEY);
    setDisplayCurrency(canDisplayVes && stored === "VES" ? "VES" : sourceCurrency);
  }, [canDisplayVes, sourceCurrency]);

  useEffect(() => {
    if (!canDisplayVes && displayCurrency !== sourceCurrency) {
      setDisplayCurrency(sourceCurrency);
    }
  }, [canDisplayVes, displayCurrency, sourceCurrency]);

  const handleCurrencyChange = useCallback(
    (event: CustomEvent<{ value: string }>) => {
      const value = event.detail.value === "VES" && canDisplayVes ? "VES" : sourceCurrency;
      setDisplayCurrency(value);
      window.localStorage.setItem(CHOICE_STORAGE_KEY, value);
    },
    [canDisplayVes, sourceCurrency],
  );

  return {
    currencyLabel: t("common.currencyLabel"),
    currencyOptions,
    displayCurrency,
    handleCurrencyChange,
  };
}
