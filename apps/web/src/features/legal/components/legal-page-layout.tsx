import { useRef } from "react";

import { LegalLinksNav } from "~/features/legal/components/legal-links-nav";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

import type { ReactNode } from "react";

interface LegalPageLayoutProps {
  children: ReactNode;
  subtitle: string;
  title: string;
}

export function LegalPageLayout({ children, subtitle, title }: LegalPageLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tenant } = usePublicTenant();
  const { template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLocale();

  if (!tenant) {
    return <PublicPageSkeleton />;
  }

  return (
    <PublicPageShell tenant={tenant} template={template}>
      <ScrollHidePageHeader
        scrollContainerRef={scrollRef}
        topbarBrand="QMENUT"
        topbarName={tenant.tenantName}
        title={title}
        subtitle={subtitle}
        langValue={lang}
        langOptions={langOptions}
        langLabel={langLabel}
        titleSize="lg"
        onQmChange={handleLanguageChange}
      />

      <div className="home-scroll" ref={scrollRef}>
        <article className="legal-surface">
          {children}
          <LegalLinksNav />
        </article>
      </div>
    </PublicPageShell>
  );
}
