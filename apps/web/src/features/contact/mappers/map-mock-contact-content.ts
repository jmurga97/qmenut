import type { MockContactContent } from "~/features/contact/mock/mock-contact-content";
import type { ContactContentViewModel } from "~/features/contact/types/contact-view-model";

export function mapMockContactContent(content: MockContactContent): ContactContentViewModel {
  return {
    form: content.form,
    googleReviewsEnabled: false,
    locations: content.locations,
    mapSectionLabel: "Ubicaciones",
    messageSectionLabel: "Mensaje",
    sitesSectionLabel: "Sedes",
    socialLinks: [],
    socialLinksLabel: "Redes sociales",
    subtitle: content.subtitle,
    title: content.title,
  };
}
