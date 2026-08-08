import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmDishRow, QM_DISH_ROW_TAG_NAME, QmDishRow as QmDishRowElement } from "./index";

defineQmDishRow();

export const QmDishRow = createComponent({
  react: React,
  tagName: QM_DISH_ROW_TAG_NAME,
  elementClass: QmDishRowElement,
  displayName: "QmDishRow",
});
