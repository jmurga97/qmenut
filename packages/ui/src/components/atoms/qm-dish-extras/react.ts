import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmDishExtras, QM_DISH_EXTRAS_TAG_NAME, QmDishExtras as QmDishExtrasElement } from "./index";

export type { QmDishExtraItem } from "./index";

defineQmDishExtras();

export const QmDishExtras = createComponent({
  react: React,
  tagName: QM_DISH_EXTRAS_TAG_NAME,
  elementClass: QmDishExtrasElement,
  displayName: "QmDishExtras",
});
