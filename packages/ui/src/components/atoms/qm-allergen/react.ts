import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmAllergen, QM_ALLERGEN_TAG_NAME, QmAllergen as QmAllergenElement } from "./index";

defineQmAllergen();

export const QmAllergen = createComponent({
  react: React,
  tagName: QM_ALLERGEN_TAG_NAME,
  elementClass: QmAllergenElement,
  displayName: "QmAllergen",
});
