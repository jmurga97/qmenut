import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmHeading, QM_HEADING_TAG_NAME, QmHeading as QmHeadingElement } from "./index";

defineQmHeading();

export const QmHeading = createComponent({
  react: React,
  tagName: QM_HEADING_TAG_NAME,
  elementClass: QmHeadingElement,
  displayName: "QmHeading",
});
