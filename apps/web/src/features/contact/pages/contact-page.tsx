import { useTranslation } from "react-i18next";

import { ContactPanel } from "~/features/contact/components/contact-panel";
import { useContactContent } from "~/features/contact/hooks/use-contact-content";
import { useContactForm } from "~/features/contact/hooks/use-contact-form";
import { InstallCard } from "~/features/install/components/install-card";
import { LegalLinksNav } from "~/features/legal/components/legal-links-nav";
import { useTrackPageView } from "~/lib/analytics/use-analytics";

export function ContactPage() {
  const content = useContactContent();

  useTrackPageView("contact_view");
  const { t } = useTranslation();
  const { contactPanelHostRef, messageValue, nameValue, submitted } = useContactForm({
    active: true,
  });

  const submitLabel = submitted ? t("contact.submittedLabel") : content.form.submitLabel;

  return (
    <div className="public-route-content-stage">
      <ContactPanel
        content={content}
        hostRef={contactPanelHostRef}
        messageValue={messageValue}
        nameValue={nameValue}
        submitLabel={submitLabel}
      />

      <InstallCard />

      <LegalLinksNav />
    </div>
  );
}
