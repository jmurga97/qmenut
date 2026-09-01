import { createPriceFormatter, createVesPriceFormatter, isUsableVesExchangeRate } from "~/shared/lib/price-formatter";

import type { PublicMenuData } from "~/features/menu/api/public-menu-types";

interface CreatePublicPriceFormatterInput {
  data: PublicMenuData;
  displayCurrency: string;
  locale: string;
}

export function createPublicPriceFormatter({
  data,
  displayCurrency,
  locale,
}: CreatePublicPriceFormatterInput): (minorUnits: number) => string {
  if (displayCurrency === "VES" && data.vesPricesEnabled && isUsableVesExchangeRate(data.vesExchangeRate)) {
    const vesFormatter = createVesPriceFormatter(locale, data.vesExchangeRate);

    if (vesFormatter) {
      return vesFormatter;
    }
  }

  return createPriceFormatter(locale, data.sourceCurrency);
}
