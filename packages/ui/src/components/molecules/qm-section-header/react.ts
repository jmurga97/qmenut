import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmSectionHeader, QM_SECTION_HEADER_TAG_NAME, QmSectionHeader as QmSectionHeaderElement } from "./index";

defineQmSectionHeader();

export const QmSectionHeader = createComponent({
  react: React,
  tagName: QM_SECTION_HEADER_TAG_NAME,
  elementClass: QmSectionHeaderElement,
  displayName: "QmSectionHeader",
});
