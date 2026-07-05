import { QmContactPanel } from "@qmenut/ui/react";

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
        mapLabel={content.mapLabel}
        nameLabel={content.form.nameLabel}
        nameValue={nameValue}
        namePlaceholder={content.form.namePlaceholder}
        messageLabel={content.form.messageLabel}
        messageValue={messageValue}
        messagePlaceholder={content.form.messagePlaceholder}
        submitLabel={submitLabel}
      >
        {content.locations.map((location) => (
          <qm-location
            key={location.name}
            slot="sedes"
            name={location.name}
            addr={location.addr}
            status={location.status}
          />
        ))}
      </QmContactPanel>
    </div>
  );
}
