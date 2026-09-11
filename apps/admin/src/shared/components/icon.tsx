import type { ReactNode, SVGProps } from "react";

/** Single source of truth for every admin glyph. Swap a path here and it changes everywhere. */
const ICONS = {
  analytics: <path d="M4 16.5V10M8 16.5V6M12 16.5V8.5M16 16.5V3.5" />,
  "arrow-left": <path d="M16 10H4.5M9 5l-5 5 5 5" />,
  "arrow-right": <path d="M4 10h11.5M11 5l5 5-5 5" />,
  branch: (
    <>
      <path d="M3.5 8.25h13L15 4H5L3.5 8.25Z" />
      <path d="M4.5 8.25v8h11v-8M8 16.25v-4.5h4v4.5" />
    </>
  ),
  copy: (
    <>
      <rect height="9" rx="1.5" width="9" x="7" y="7" />
      <path d="M13 4.5H5.5A1.5 1.5 0 0 0 4 6v7.5" />
    </>
  ),
  download: <path d="M10 3.5v9M6.5 9l3.5 3.5L13.5 9M4.5 16h11" />,
  drag: <path d="M8 5.5h.01M8 10h.01M8 14.5h.01M12 5.5h.01M12 10h.01M12 14.5h.01" />,
  edit: (
    <path d="m12.75 4.75 2.5 2.5M4 16l.75-3 8.25-8.25a1.24 1.24 0 0 1 1.75 0l.5.5a1.24 1.24 0 0 1 0 1.75L7 15.25 4 16Z" />
  ),
  image: (
    <>
      <rect height="11" rx="1.5" width="13" x="3.5" y="4.5" />
      <path d="m4 13.5 3.5-3.5 3 3 2-1.5 3.5 3" />
      <circle cx="7.25" cy="8" r="1" />
    </>
  ),
  languages: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M3.75 10h12.5M10 3.5c2 1.8 3 3.97 3 6.5s-1 4.7-3 6.5c-2-1.8-3-3.97-3-6.5s1-4.7 3-6.5Z" />
    </>
  ),
  logout: <path d="M8 4H4.5v12H8M11.5 6.5 15 10l-3.5 3.5M7 10h8" />,
  loyalty: <path d="M10 16s-6-3.4-6-8a3.25 3.25 0 0 1 6-1.75A3.25 3.25 0 0 1 16 8c0 4.6-6 8-6 8Z" />,
  menu: <path d="M4 4.5h12v11H4zM7 8h6M7 11h4" />,
  overview: (
    <>
      <rect height="5" rx="1" width="5" x="3.5" y="3.5" />
      <rect height="5" rx="1" width="5" x="11.5" y="3.5" />
      <rect height="5" rx="1" width="5" x="3.5" y="11.5" />
      <rect height="5" rx="1" width="5" x="11.5" y="11.5" />
    </>
  ),
  plus: <path d="M10 4v12M4 10h12" />,
  promotions: (
    <>
      <path d="m3.5 9 5.5-5.5h6.5v6.5L10 15.5 3.5 9Z" />
      <circle cx="12.75" cy="6.25" r="1" />
    </>
  ),
  "public-site": <path d="M11 4h5v5M9 11l7-7M15 11.5V16H4V5h4.5" />,
  qr: <path d="M4 4h4v4H4zM12 4h4v4h-4zM4 12h4v4H4zM12 12h1.5v1.5H12zM14.5 14.5H16V16h-1.5zM14.5 11.75H16" />,
  refresh: <path d="M16 10a6 6 0 1 1-1.9-4.4M16.25 3.5v3h-3" />,
  search: (
    <>
      <circle cx="9" cy="9" r="4.75" />
      <path d="m12.5 12.5 3.75 3.75" />
    </>
  ),
  star: <path d="m10 3.5 2 4.2 4.5.6-3.3 3.2.8 4.5-4-2.2-4 2.2.8-4.5L3.5 8.3l4.5-.6Z" />,
  theme: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5a6.5 6.5 0 0 0 0 13V3.5Z" />
    </>
  ),
  trash: <path d="M4.5 6.5h11M8 6.5V4.5h4v2M5.75 6.5l.6 9.25h7.3l.6-9.25M8.5 9.25v4M11.5 9.25v4" />,
  users: (
    <>
      <circle cx="10" cy="7" r="2.5" />
      <path d="M5.5 16c.35-2.35 2-3.75 4.5-3.75s4.15 1.4 4.5 3.75" />
      <path d="M15 5.25a2.3 2.3 0 0 1 0 4.5M16.5 13c.8.55 1.25 1.5 1.4 2.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: Omit<SVGProps<SVGSVGElement>, "children"> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      className="ming-icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 20 20"
      {...props}
    >
      {ICONS[name]}
    </svg>
  );
}
