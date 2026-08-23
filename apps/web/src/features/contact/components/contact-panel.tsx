import { QmContactPanel } from "@qmenut/ui/components/qm-contact-panel/react";
import { QmLocation } from "@qmenut/ui/components/qm-location/react";

import { GoogleReviewsLazy } from "~/features/contact/components/google-reviews-lazy";

import type { ContactContentViewModel } from "~/features/contact/types/contact-view-model";

interface ContactPanelProps {
  content: ContactContentViewModel;
}

export function ContactPanel({ content }: ContactPanelProps) {
  return (
    <div>
      <QmContactPanel
        value={{
          map: content.map,
          ubicacionLabel: content.mapSectionLabel,
          sedesLabel: content.sitesSectionLabel,
          socialLinks: content.socialLinks,
          socialLinksLabel: content.socialLinksLabel,
        }}
      >
        {content.locations.map((location) => (
          <QmLocation key={location.id ?? location.name} slot="sedes" value={location} />
        ))}
        {content.googleReviewsEnabled ? (
          <div slot="reviews" style={{ display: "contents" }}>
            <GoogleReviewsLazy />
          </div>
        ) : null}
      </QmContactPanel>
    </div>
  );
}
