export interface QmSocialLink {
  href: string;
  label: string;
}

export type SocialIcon =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "pinterest"
  | "tiktok"
  | "whatsapp"
  | "x"
  | "youtube"
  | "generic";

export function socialIcon({ href, label }: QmSocialLink): SocialIcon {
  const value = `${label} ${href}`.toLowerCase();

  if (value.includes("instagram")) return "instagram";
  if (value.includes("facebook") || value.includes("fb.com")) return "facebook";
  if (value.includes("linkedin")) return "linkedin";
  if (value.includes("pinterest")) return "pinterest";
  if (value.includes("tiktok")) return "tiktok";
  if (value.includes("whatsapp") || value.includes("wa.me")) return "whatsapp";
  if (value.includes("youtube") || value.includes("youtu.be")) return "youtube";
  if (value.includes("twitter") || value.includes("x.com")) return "x";

  return "generic";
}
