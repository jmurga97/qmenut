import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmFeatured, QM_FEATURED_TAG_NAME, QmFeatured as QmFeaturedElement } from "./index";

defineQmFeatured();

export const QmFeatured = createComponent({
  react: React,
  tagName: QM_FEATURED_TAG_NAME,
  elementClass: QmFeaturedElement,
  displayName: "QmFeatured",
});
