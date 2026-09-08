import { socialIcon } from "@qmenut/ui/components/qm-social-links";

import type { SocialIcon as SocialIconName } from "@qmenut/ui/components/qm-social-links";

const ICONS: Record<SocialIconName, React.JSX.Element> = {
  instagram: (
    <svg viewBox="0 0 24 24">
      <rect height="18" rx="5" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" />
      <circle className="fill" cx="17.4" cy="6.6" r="1.1" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24">
      <path d="M14 21v-8h3l.5-4H14V7c0-1.2.5-2 2.1-2H18V1.3A25 25 0 0 0 15 1c-3 0-5 1.8-5 5.4V9H7v4h3v8" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24">
      <rect height="12" rx="1" width="4" x="3" y="9" />
      <circle className="fill" cx="5" cy="4.5" r="2" />
      <path d="M11 21V9h4v1.8A4.5 4.5 0 0 1 22 14.6V21h-4v-5.5c0-1.7-.7-2.7-2-2.7s-1.9 1-1.9 2.7V21" />
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24">
      <path d="M9.5 21c1.2-3.1 1.4-4 2-6.8-.9-1.6.1-4.8 1.8-4.8 1.4 0 1.6 1.3 1.3 2.5-.4 1.5-1.1 3.1.4 3.8 1.4.7 3.5-.7 4-3.2.8-3.7-2-6.5-5.8-6.5-4.2 0-6.7 3.1-6.7 6.2 0 1.2.5 2.5 1.3 3.2" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24">
      <path d="M15 3v11.5a4.5 4.5 0 1 1-4-4.5v4a1.5 1.5 0 1 0 1 1.4V3h3c.4 2.2 1.7 3.5 4 4v3c-1.5-.1-2.8-.6-4-1.4" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24">
      <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2a16 16 0 0 0-.5 3.8A16 16 0 0 0 3 15.8a3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 16 16 0 0 0 .5-3.8 16 16 0 0 0-.5-3.8Z" />
      <path className="fill" d="m10 15 5-3-5-3Z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24">
      <path d="M4 3 20 21M20 3 4 21" />
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  ),
};

export function SocialIcon({ href }: { href: string }) {
  const icon = socialIcon({ href, label: "" });
  return (
    <span aria-hidden="true" className="admin-social-icon">
      {ICONS[icon]}
    </span>
  );
}
