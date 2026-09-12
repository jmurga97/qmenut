import type { QmLocationScheduleGroup } from "@qmenut/ui/components/qm-location/react";
import type { TFunction } from "i18next";
import type { ContactContentViewModel } from "~/features/contact/types/contact-view-model";
import type { PublicMenuData } from "~/shared/public-menu/public-menu-types";

type ContactBranch = PublicMenuData["contactBranches"][number];

interface MapPublicContactContentInput {
  data: PublicMenuData | null;
  locale: string;
  t: TFunction;
}

function formatMinute(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function formatSchedule({ branch, locale }: { branch: ContactBranch; locale: string }): QmLocationScheduleGroup[] {
  const { schedules } = branch;
  if (schedules.length === 0) return [];

  const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const daySchedules = [...Map.groupBy(schedules, (schedule) => schedule.dayOfWeek).entries()]
    .toSorted(([dayA], [dayB]) => dayA - dayB)
    .map(([day, rows]) => ({
      day,
      intervals: rows
        .toSorted((a, b) => a.openMinute - b.openMinute)
        .map((row) => `${formatMinute(row.openMinute)}–${formatMinute(row.closeMinute)}`),
    }));
  const groups: { days: number[]; intervals: string[] }[] = [];
  for (const current of daySchedules) {
    const previous = groups.at(-1);
    const previousDay = previous?.days.at(-1);
    if (
      previous &&
      previousDay !== undefined &&
      current.day === previousDay + 1 &&
      current.intervals.join("|") === previous.intervals.join("|")
    ) {
      previous.days.push(current.day);
    } else {
      groups.push({ days: [current.day], intervals: current.intervals });
    }
  }

  const formatDay = (day: number) => dayFormatter.format(new Date(Date.UTC(2024, 0, day)));
  return groups.map(({ days, intervals }) => {
    const first = formatDay(days[0]);
    const last = formatDay(days.at(-1)!);
    const dayLabel = days.length === 1 ? first : `${first}–${last}`;
    return { dayLabel, intervals };
  });
}

function normalizePhone(value: string | null): string | undefined {
  const normalized = value?.replaceAll(/[^+\d]/g, "");
  return normalized && /^\+\d{8,15}$/.test(normalized) ? normalized : undefined;
}

function socialLinks(value: unknown): { href: string; label: string }[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value).flatMap(([label, url]) => {
    if (typeof url !== "string") return [];

    try {
      return [{ href: new URL(url).href, label }];
    } catch {
      return [];
    }
  });
}

function uniqueSocialLinks(branches: ContactBranch[]): { href: string; label: string }[] {
  const links = branches.flatMap((branch) => socialLinks(branch.socialLinks));
  return new Map(links.map((link) => [link.href, link])).values().toArray();
}

function hasCoordinates(branch: ContactBranch): branch is ContactBranch & {
  latitude: number;
  longitude: number;
} {
  return (
    Number.isFinite(branch.latitude) &&
    branch.latitude !== null &&
    branch.latitude >= -90 &&
    branch.latitude <= 90 &&
    Number.isFinite(branch.longitude) &&
    branch.longitude !== null &&
    branch.longitude >= -180 &&
    branch.longitude <= 180
  );
}

function directionsHref(branch: ContactBranch): string | undefined {
  const destination = hasCoordinates(branch) ? `${branch.latitude},${branch.longitude}` : branch.address?.trim();
  if (!destination) return undefined;

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);
  return url.href;
}

function menuHref(branch: ContactBranch, requestedLocale: string | null): string | undefined {
  if (!branch.customDomain) return undefined;

  const localePrefix = requestedLocale ? `/${requestedLocale}` : "";
  return `https://${branch.customDomain}${localePrefix}/`;
}

export function mapPublicContactContent({ data, locale, t }: MapPublicContactContentInput): ContactContentViewModel {
  const branches = data?.contactBranches ?? [];
  const markers = branches.flatMap((branch) => {
    const href = directionsHref(branch);
    if (!hasCoordinates(branch) || !href) return [];

    return [
      {
        address: branch.address ?? "",
        current: branch.id === data?.branch.id,
        directionsHref: href,
        id: branch.id,
        latitude: branch.latitude,
        longitude: branch.longitude,
        name: branch.name,
      },
    ];
  });

  return {
    googleReviewsEnabled: data?.branch.googleReviewsEnabled ?? false,
    locations: branches.map((branch) => {
      const phone = normalizePhone(branch.phone);
      const whatsapp = normalizePhone(branch.whatsapp);
      const isCurrent = branch.id === data?.branch.id;
      const schedule = formatSchedule({ branch, locale });

      return {
        actionsLabel: t("contact.page.actionsLabel", { name: branch.name }),
        addr: branch.address ?? "",
        id: branch.id,
        mapHref: directionsHref(branch),
        mapLabel: t("contact.page.mapLinkLabel"),
        menuHref: isCurrent ? undefined : menuHref(branch, data?.language.requested ?? null),
        menuLabel: t("contact.page.viewMenuLabel"),
        name: branch.name,
        phone,
        phoneHref: phone ? `tel:${phone}` : undefined,
        phoneLabel: t("contact.page.callLabel"),
        schedule,
        status: t("contact.page.scheduleUnavailable"),
        whatsappHref: whatsapp ? `https://wa.me/${whatsapp.replace("+", "")}` : undefined,
        whatsappLabel: t("contact.page.whatsappLabel"),
      };
    }),
    map:
      markers.length > 0
        ? {
            ariaLabel: t("contact.page.mapAriaLabel", { count: markers.length }),
            markers,
            openMapsLabel: t("contact.page.openGoogleMapsLabel"),
          }
        : undefined,
    mapSectionLabel: t("contact.page.locationSectionLabel", { count: markers.length }),
    sitesSectionLabel: t("contact.page.sitesSectionLabel"),
    socialLinks: uniqueSocialLinks(branches),
    socialLinksLabel: t("contact.page.socialLinksLabel"),
    subtitle: t("contact.page.subtitle"),
    title: t("contact.page.title"),
  };
}
