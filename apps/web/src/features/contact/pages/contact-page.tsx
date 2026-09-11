import { ContactPanel } from "~/features/contact/components/contact-panel";
import { useContactContent } from "~/features/contact/hooks/use-contact-content";
import { useTrackPageView } from "~/lib/analytics/use-analytics";

import type { ReactNode } from "react";

interface ContactPageProps {
  installCard: ReactNode;
  legalLinksNav: ReactNode;
}

export function ContactPage({ installCard, legalLinksNav }: ContactPageProps) {
  const content = useContactContent();

  useTrackPageView("contact_view");

  return (
    <div>
      <ContactPanel content={content} />

      {installCard}

      {legalLinksNav}
    </div>
  );
}
