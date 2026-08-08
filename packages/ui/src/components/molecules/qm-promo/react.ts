import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmPromo, QM_PROMO_TAG_NAME, QmPromo as QmPromoElement } from "./index";

export type { QmPromoValue } from "./index";

defineQmPromo();

export const QmPromo = createComponent({
  react: React,
  tagName: QM_PROMO_TAG_NAME,
  elementClass: QmPromoElement,
  displayName: "QmPromo",
});
