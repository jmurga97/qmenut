import "i18next";

import type en from "~/lib/locales/en/translation.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    keySeparator: "___";
    nsSeparator: false;
    resources: { translation: typeof en };
  }
}
