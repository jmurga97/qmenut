import type { QmLocationValue } from "@qmenut/ui/components/qm-location/react";
import type { QmMapValue } from "@qmenut/ui/components/qm-map";
import type { QmSocialLink } from "@qmenut/ui/components/qm-social-links";

export type ContactLocationViewModel = QmLocationValue;

export interface ContactContentViewModel {
  googleReviewsEnabled: boolean;
  locations: ContactLocationViewModel[];
  map?: QmMapValue;
  mapSectionLabel: string;
  sitesSectionLabel: string;
  socialLinks: QmSocialLink[];
  socialLinksLabel: string;
  subtitle: string;
  title: string;
}
