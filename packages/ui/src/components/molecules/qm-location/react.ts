import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmLocation, QM_LOCATION_TAG_NAME, QmLocation as QmLocationElement } from "./index";

export type { QmLocationValue } from "./index";

defineQmLocation();

export const QmLocation = createComponent({
  react: React,
  tagName: QM_LOCATION_TAG_NAME,
  elementClass: QmLocationElement,
  displayName: "QmLocation",
});
