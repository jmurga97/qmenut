import { useRef } from "react";

import { ContactPanel } from "~/features/contact/components/contact-panel";
import { useContactContent } from "~/features/contact/hooks/use-contact-content";
import { InstallCard } from "~/features/install/components/install-card";
import { LegalLinksNav } from "~/features/legal/components/legal-links-nav";
import { useTrackPageView } from "~/lib/analytics/use-analytics";

export function ContactPage() {
  const content = useContactContent();
  const contactPanelHostRef = useRef<HTMLDivElement>(null);

  useTrackPageView("contact_view");

  return (
    <div className="public-route-content-stage">
      <ContactPanel content={content} hostRef={contactPanelHostRef} />

      <InstallCard />

      <LegalLinksNav />
    </div>
  );
}
