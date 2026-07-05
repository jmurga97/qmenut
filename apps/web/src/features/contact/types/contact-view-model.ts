export interface ContactLocationViewModel {
  addr: string;
  name: string;
  status: string;
}

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
