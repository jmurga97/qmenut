import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { ContactPanel } from "~/features/contact/components/contact-panel";
import { useContactContent } from "~/features/contact/hooks/use-contact-content";
import { useContactForm } from "~/features/contact/hooks/use-contact-form";
import { DevTemplateSwitcher } from "~/shared/components/dev-template-switcher";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

export function ContactPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const content = useContactContent();
  const { tenant } = usePublicTenant();
  const { setTemplate, template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLocale();

  useTrackPageView("contact_view");
  const { t } = useTranslation();
  const { contactPanelHostRef, messageValue, nameValue, submitted } = useContactForm({
    active: tenant !== null,
  });

  if (!tenant) {
    return <PublicPageSkeleton />;
  }

  const submitLabel = submitted ? t("contact.submittedLabel") : content.form.submitLabel;

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

          <nav className="legal-links" aria-label="Páginas legales">
            <Link to="/{-$locale}/aviso-legal" params={(prev) => prev}>
              Aviso legal
            </Link>
            <Link to="/{-$locale}/privacidad" params={(prev) => prev}>
              Política de privacidad
            </Link>
          </nav>
        </div>
      </PublicPageShell>
      <DevTemplateSwitcher currentTemplate={template} onSelectTemplate={setTemplate} />
    </>
  );
}
