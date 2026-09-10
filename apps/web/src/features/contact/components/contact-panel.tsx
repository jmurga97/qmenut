import { QmContactPanel } from "@qmenut/ui/components/qm-contact-panel/react";
import { QmLocation } from "@qmenut/ui/components/qm-location/react";
import { Fragment, useRef } from "react";

import { GoogleReviewsLazy } from "~/features/contact/components/google-reviews-lazy";
import { useContactActionTracking } from "~/features/contact/hooks/use-contact-action-tracking";

import type { FragmentInstance } from "react";
import type { ContactContentViewModel } from "~/features/contact/types/contact-view-model";

interface ContactPanelProps {
  content: ContactContentViewModel;
}

export function ContactPanel({ content }: ContactPanelProps) {
  const hostRef = useRef<FragmentInstance>(null);
  useContactActionTracking(hostRef);

  return (
    <Fragment ref={hostRef}>
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
    </Fragment>
  );
}
