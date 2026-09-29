import { Link } from "@tanstack/react-router";

import type { LinkProps } from "@tanstack/react-router";

export interface SectionTab {
  /** Only active on this exact path; leave off so nested routes keep their parent tab active. */
  exact?: boolean;
  label: string;
  to: LinkProps["to"];
}

export function SectionTabs({ ariaLabel, tabs }: { ariaLabel: string; tabs: readonly SectionTab[] }) {
  return (
    <nav aria-label={ariaLabel} className="admin-section-tabs">
      {tabs.map((tab) => (
        <Link activeOptions={{ exact: tab.exact }} className="admin-section-tab" key={tab.to} to={tab.to}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
