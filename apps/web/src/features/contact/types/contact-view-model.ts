import type { QmLocationValue } from "@qmenut/ui/components/qm-location/react";
import type { QmMapValue } from "@qmenut/ui/components/qm-map";

export type ContactLocationViewModel = QmLocationValue;

export interface ContactFormViewModel {
  messageLabel: string;
  messagePlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  submitLabel: string;
}

export interface ContactContentViewModel {
  form: ContactFormViewModel;
  locations: ContactLocationViewModel[];
  map?: QmMapValue;
  mapSectionLabel: string;
  messageSectionLabel: string;
  sitesSectionLabel: string;
  subtitle: string;
  title: string;
}
