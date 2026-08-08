import type { QmLocationValue } from "@qmenut/ui/components/qm-location/react";

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
  mapLabel: string;
  subtitle: string;
  title: string;
}
