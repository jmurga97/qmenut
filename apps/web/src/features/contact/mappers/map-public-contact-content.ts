import type { TFunction } from "i18next";
import type { ContactContentViewModel } from "~/features/contact/types/contact-view-model";
import type { PublicMenuData } from "~/features/menu/api/public-menu-types";

interface MapPublicContactContentInput {
  data: PublicMenuData | null;
  locale: string;
  t: TFunction;
}

function formatMinute(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function formatSchedule({ data, locale, t }: { data: PublicMenuData; locale: string; t: TFunction }): string {
  const schedules = data.branch.schedules;

  if (schedules.length === 0) return t("contact.page.scheduleUnavailable");

  const days = [...new Set(schedules.map((schedule) => schedule.dayOfWeek))].toSorted((a, b) => a - b);
  const earliestOpen = Math.min(...schedules.map((schedule) => schedule.openMinute));
  const latestClose = Math.max(...schedules.map((schedule) => schedule.closeMinute));
  const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const dayLabels = days.map((day) => dayFormatter.format(new Date(Date.UTC(2024, 0, day))));
  const dayRange = dayLabels.length === 1 ? dayLabels[0] : `${dayLabels[0]}–${dayLabels.at(-1)}`;

  return `${dayRange} · ${formatMinute(earliestOpen)}–${formatMinute(latestClose)}`;
}

function normalizePhone(value: string | null): string | undefined {
  const normalized = value?.replaceAll(/[^+\d]/g, "");
  return normalized && /^\+\d{8,15}$/.test(normalized) ? normalized : undefined;
}

function firstSocialLink(value: unknown): { label: string; url: string } | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;

  for (const [label, url] of Object.entries(value)) {
    if (typeof url !== "string") continue;

    try {
      return { label, url: new URL(url).href };
    } catch {
      continue;
    }
  }

  return null;
}

export function mapPublicContactContent({ data, locale, t }: MapPublicContactContentInput): ContactContentViewModel {
  const branch = data?.branch;
  const address = branch?.address ?? "";
  const phone = normalizePhone(branch?.phone ?? null);
  const whatsapp = normalizePhone(branch?.whatsapp ?? null);
  const social = firstSocialLink(branch?.socialLinks);
  const mapQuery = branch ? encodeURIComponent(`${branch.name}, ${address}`) : "";

  return {
    form: {
      messageLabel: t("contact.page.messageLabel"),
      messagePlaceholder: t("contact.page.messagePlaceholder"),
      nameLabel: t("contact.page.nameLabel"),
      namePlaceholder: t("contact.page.namePlaceholder"),
      submitLabel: t("contact.page.submitLabel"),
    },
    locations: branch
      ? [
          {
            actionsLabel: t("contact.page.actionsLabel"),
            addr: address,
            mapHref: address ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : undefined,
            mapLabel: t("contact.page.mapLinkLabel"),
            name: branch.name,
            phone,
            phoneHref: phone ? `tel:${phone}` : undefined,
            phoneLabel: t("contact.page.callLabel"),
            socialHref: social?.url,
            socialLabel: social?.label,
            status: data ? formatSchedule({ data, locale, t }) : t("contact.page.scheduleUnavailable"),
            whatsappHref: whatsapp ? `https://wa.me/${whatsapp.replace("+", "")}` : undefined,
            whatsappLabel: t("contact.page.whatsappLabel"),
          },
        ]
      : [],
    mapLabel: t("contact.page.mapLabel", { name: branch?.name ?? "" }),
    subtitle: t("contact.page.subtitle"),
    title: t("contact.page.title"),
  };
}
