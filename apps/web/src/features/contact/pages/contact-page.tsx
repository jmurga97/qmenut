import { useRef } from "react";

import { ContactPanel } from "~/features/contact/components/contact-panel";
import { useContactContent } from "~/features/contact/hooks/use-contact-content";
import { useContactForm } from "~/features/contact/hooks/use-contact-form";
import { DevTemplateSwitcher } from "~/shared/components/dev-template-switcher";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { useLanguage } from "~/shared/hooks/use-language";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

export function ContactPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const content = useContactContent();
  const { tenant } = usePublicTenant();
  const { setTemplate, template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLanguage();
  const { contactPanelHostRef, messageValue, nameValue, submitted } = useContactForm({
    active: tenant !== null,
  });

  if (!tenant) {
    return <PublicPageSkeleton />;
  }

  const submitLabel = submitted ? "Enviado" : content.form.submitLabel;

  return (
    <>
      <PublicPageShell tenant={tenant} template={template}>
        <ScrollHidePageHeader
          scrollContainerRef={scrollRef}
          topbarBrand="QMENUT"
          topbarName={tenant.tenantName}
          title={content.title}
          subtitle={content.subtitle}
          langValue={lang}
          langOptions={langOptions}
          langLabel={langLabel}
          titleSize="lg"
          onQmChange={handleLanguageChange}
        />

        <div className="home-scroll" ref={scrollRef}>
          <ContactPanel
            content={content}
            hostRef={contactPanelHostRef}
            messageValue={messageValue}
            nameValue={nameValue}
            submitLabel={submitLabel}
          />
        </div>
      </PublicPageShell>
      <DevTemplateSwitcher currentTemplate={template} onSelectTemplate={setTemplate} />
    </>
  );
}
