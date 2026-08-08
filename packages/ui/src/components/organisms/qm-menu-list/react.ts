import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmMenuList, QM_MENU_LIST_TAG_NAME, QmMenuList as QmMenuListElement } from "./index";

defineQmMenuList();

export const QmMenuList = createComponent({
  react: React,
  tagName: QM_MENU_LIST_TAG_NAME,
  elementClass: QmMenuListElement,
  displayName: "QmMenuList",
});
