import { LegalLinksNav } from "~/features/legal/components/legal-links-nav";

import type { ReactNode } from "react";

interface LegalPageLayoutProps {
  children: ReactNode;
}

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  return (
    <article className="legal-surface">
      {children}
      <LegalLinksNav />
    </article>
  );
}
