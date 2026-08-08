import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmPromoList, QM_PROMO_LIST_TAG_NAME, QmPromoList as QmPromoListElement } from "./index";

export type { QmPromoListValue } from "./index";

defineQmPromoList();

export const QmPromoList = createComponent({
  react: React,
  tagName: QM_PROMO_LIST_TAG_NAME,
  elementClass: QmPromoListElement,
  displayName: "QmPromoList",
});
