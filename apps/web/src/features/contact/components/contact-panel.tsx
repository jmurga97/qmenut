import { QmContactPanel } from "@qmenut/ui/components/qm-contact-panel/react";
import { QmLocation } from "@qmenut/ui/components/qm-location/react";

import type { RefObject } from "react";
import type { ContactContentViewModel } from "~/features/contact/types/contact-view-model";

interface ContactPanelProps {
  content: ContactContentViewModel;
  hostRef: RefObject<HTMLDivElement | null>;
  messageValue: string;
  nameValue: string;
  submitLabel: string;
}

export function ContactPanel({ content, hostRef, messageValue, nameValue, submitLabel }: ContactPanelProps) {
  return (
    <div ref={hostRef}>
      <QmContactPanel
        value={{
          map: content.map,
          ubicacionLabel: content.mapSectionLabel,
          sedesLabel: content.sitesSectionLabel,
          mensajeLabel: content.messageSectionLabel,
          nameLabel: content.form.nameLabel,
          namePlaceholder: content.form.namePlaceholder,
          messageLabel: content.form.messageLabel,
          messagePlaceholder: content.form.messagePlaceholder,
        }}
        nameValue={nameValue}
        messageValue={messageValue}
        submitLabel={submitLabel}
      >
        {content.locations.map((location) => (
          <QmLocation key={location.id ?? location.name} slot="sedes" value={location} />
        ))}
      </QmContactPanel>
    </div>
  );
}
