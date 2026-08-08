import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmNavBar, QM_NAV_BAR_TAG_NAME, QmNavBar as QmNavBarElement } from "./index";

defineQmNavBar();

export const QmNavBar = createComponent({
  react: React,
  tagName: QM_NAV_BAR_TAG_NAME,
  elementClass: QmNavBarElement,
  displayName: "QmNavBar",
});
