import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmCategoryNav, QM_CATEGORY_NAV_TAG_NAME, QmCategoryNav as QmCategoryNavElement } from "./index";

defineQmCategoryNav();

export const QmCategoryNav = createComponent({
  react: React,
  tagName: QM_CATEGORY_NAV_TAG_NAME,
  elementClass: QmCategoryNavElement,
  displayName: "QmCategoryNav",
});
