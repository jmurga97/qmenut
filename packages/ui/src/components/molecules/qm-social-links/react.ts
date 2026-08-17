import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmSocialLinks, QM_SOCIAL_LINKS_TAG_NAME, QmSocialLinks as QmSocialLinksElement } from "./index";

export type { QmSocialLink } from "./index";

defineQmSocialLinks();

export const QmSocialLinks = createComponent({
  react: React,
  tagName: QM_SOCIAL_LINKS_TAG_NAME,
  elementClass: QmSocialLinksElement,
  displayName: "QmSocialLinks",
});
