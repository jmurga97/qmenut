import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { ISR_CACHE_CONTROL } from "../lib/isr";
import { getPublicMenuHost } from "../lib/trpc-client";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";
import type { TrpcOptionsProxy } from "../lib/trpc-client";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PublicMenuData = NonNullable<RouterOutputs["menu"]["publicData"]>;
type PublicBranch = PublicMenuData["branch"];
type PublicCategory = PublicMenuData["categories"][number];
type PublicDish = PublicCategory["dishes"][number];
type PublicTranslation = PublicDish["translations"][number];

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getPublicMenuInput(): { host: string } | undefined {
  const host = getPublicMenuHost();

  if (!host) {
    return undefined;
  }

  return { host };
}

function getPublicMenuQueryOptions(trpc: TrpcOptionsProxy) {
  return trpc.menu.publicData.queryOptions(getPublicMenuInput());
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load this menu right now.";
}

function formatPrice({ amount, currency }: { amount: number; currency: string }): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function formatMinute(value: number): string {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatSchedule(schedule: PublicBranch["schedules"][number]): string {
  const day = dayLabels[schedule.dayOfWeek - 1] ?? "Day";

  return `${day} ${formatMinute(schedule.openMinute)}-${formatMinute(schedule.closeMinute)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSocialLinks(value: unknown): Array<{ label: string; url: string }> {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([label, url]) => {
    if (typeof url !== "string" || !url.trim()) {
      return [];
    }

    return [{ label, url }];
  });
}

function getWhatsappHref(value: string | null): string | null {
  const cleaned = value?.replace(/[^\d+]/g, "");

  if (!cleaned) {
    return null;
  }

  return `https://wa.me/${cleaned.replace(/^\+/, "")}`;
}

function hasDishes(data: PublicMenuData): boolean {
  return data.categories.some((category) => category.dishes.length > 0);
}

function getPromotionLabel(promotion: NonNullable<PublicDish["promotion"]>): string {
  switch (promotion.type) {
    case "daily_menu":
      return "Menu deal";
    case "happy_hour":
      return "Happy hour";
    case "percentage_discount":
      return `${promotion.percentage ?? 0}% off`;
    case "special_price":
      return "Special price";
    case "two_for_one":
      return `${promotion.buyQuantity ?? 2} for ${promotion.paidQuantity ?? 1}`;
  }
}

function StatusScreen({ message, title }: { message: string; title: string }) {
  return (
    <main className="status-shell">
      <section className="status-panel">
        <p className="eyebrow">QMenut</p>
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

function BranchMedia({ branch }: { branch: PublicBranch }) {
  if (branch.photos.length === 0) {
    return <div className="branch-photo-fallback" aria-hidden="true" />;
  }

  return (
    <div className="branch-photos">
      {branch.photos.slice(0, 3).map((photo) => (
        <img key={photo.id} src={photo.url} alt="" loading="lazy" />
      ))}
    </div>
  );
}

function BranchHeader({ branch }: { branch: PublicBranch }) {
  const socialLinks = useMemo(() => getSocialLinks(branch.socialLinks), [branch.socialLinks]);
  const whatsappHref = getWhatsappHref(branch.whatsapp);

  return (
    <header className="branch-header">
      <div className="branch-copy">
        <p className="eyebrow">Public menu</p>
        <h1>{branch.name}</h1>
        <div className="branch-meta">
          {branch.address ? <span>{branch.address}</span> : null}
          {branch.schedules.slice(0, 2).map((schedule) => (
            <span key={schedule.id}>{formatSchedule(schedule)}</span>
          ))}
        </div>
        <div className="branch-actions" aria-label="Contact options">
          {branch.phone ? <a href={`tel:${branch.phone}`}>Call</a> : null}
          {whatsappHref ? (
            <a href={whatsappHref} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
          ) : null}
          {socialLinks.slice(0, 3).map((link) => (
            <a key={link.label} href={link.url} rel="noreferrer" target="_blank">
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <BranchMedia branch={branch} />
    </header>
  );
}

function CategoryNav({ categories }: { categories: PublicCategory[] }) {
  const visibleCategories = categories.filter((category) => category.dishes.length > 0);

  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <nav className="category-nav" aria-label="Menu categories">
      {visibleCategories.map((category) => (
        <a key={category.id} href={`#category-${category.id}`}>
          {category.name}
        </a>
      ))}
    </nav>
  );
}

function TranslationLine({ translations }: { translations: PublicTranslation[] }) {
  const visibleTranslations = translations
    .filter((translation) => translation.field === "name" || translation.field === "description")
    .slice(0, 2);

  if (visibleTranslations.length === 0) {
    return null;
  }

  return (
    <p className="translation-line">
      {visibleTranslations.map((translation) => `${translation.languageCode}: ${translation.value}`).join(" / ")}
    </p>
  );
}

function BadgeList({ dish }: { dish: PublicDish }) {
  const badges = [
    ...dish.tags.map((tag) => tag.label ?? tag.code).filter((label): label is string => Boolean(label)),
    ...dish.allergens.map((allergen) => allergen.code),
  ];

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="badge-row">
      {badges.map((badge) => (
        <span key={badge}>{badge}</span>
      ))}
    </div>
  );
}

function PriceBlock({ currency, dish }: { currency: string; dish: PublicDish }) {
  const promotion = dish.promotion;
  const hasLowerPrice = promotion ? promotion.effectiveUnitPrice < dish.price : false;

  if (!promotion) {
    return <strong>{formatPrice({ amount: dish.price, currency })}</strong>;
  }

  return (
    <div className="price-block">
      {hasLowerPrice ? (
        <>
          <strong>{formatPrice({ amount: promotion.effectiveUnitPrice, currency })}</strong>
          <s>{formatPrice({ amount: dish.price, currency })}</s>
        </>
      ) : (
        <strong>{formatPrice({ amount: dish.price, currency })}</strong>
      )}
      <span>{getPromotionLabel(promotion)}</span>
    </div>
  );
}

function VariantSummary({ dish }: { dish: PublicDish }) {
  if (dish.variantGroups.length === 0) {
    return null;
  }

  return (
    <div className="variant-list">
      {dish.variantGroups.map((group) => (
        <div key={group.id}>
          <span>{group.name}</span>
          <small>
            {group.options.map((option) => option.name).join(", ")}
            {group.isRequired ? " required" : ""}
          </small>
        </div>
      ))}
    </div>
  );
}

function DishCard({ currency, dish }: { currency: string; dish: PublicDish }) {
  return (
    <article className="dish-card">
      {dish.imageUrl ? <img src={dish.imageUrl} alt="" loading="lazy" /> : null}
      <div className="dish-body">
        <div className="dish-title-row">
          <div>
            <h3>{dish.name}</h3>
            <TranslationLine translations={dish.translations} />
          </div>
          <PriceBlock currency={currency} dish={dish} />
        </div>
        {dish.description ? <p>{dish.description}</p> : null}
        <BadgeList dish={dish} />
        <VariantSummary dish={dish} />
      </div>
    </article>
  );
}

function CategorySection({ category, currency }: { category: PublicCategory; currency: string }) {
  if (category.dishes.length === 0) {
    return null;
  }

  return (
    <section className="menu-section" id={`category-${category.id}`}>
      <div className="section-heading">
        <div>
          <h2>{category.name}</h2>
          <TranslationLine translations={category.translations} />
        </div>
        {category.description ? <p>{category.description}</p> : null}
      </div>
      <div className="dish-grid">
        {category.dishes.map((dish) => (
          <DishCard key={dish.id} currency={currency} dish={dish} />
        ))}
      </div>
    </section>
  );
}

function MenuPage({ data }: { data: PublicMenuData }) {
  return (
    <main className="menu-shell">
      <BranchHeader branch={data.branch} />
      <CategoryNav categories={data.categories} />
      {hasDishes(data) ? (
        data.categories.map((category) => (
          <CategorySection key={category.id} category={category} currency={data.branch.currency} />
        ))
      ) : (
        <section className="empty-menu">
          <h2>Menu coming soon</h2>
          <p>This branch is online, but its public dishes are not published yet.</p>
        </section>
      )}
    </main>
  );
}

function HomePage() {
  const { trpc } = Route.useRouteContext();
  const menuQuery = useQuery(getPublicMenuQueryOptions(trpc));

  if (menuQuery.isPending) {
    return <StatusScreen title="Loading menu" message="Fetching the latest public menu." />;
  }

  if (menuQuery.isError) {
    return <StatusScreen title="Menu unavailable" message={getErrorMessage(menuQuery.error)} />;
  }

  if (!menuQuery.data) {
    return <StatusScreen title="Menu not found" message="No active branch is mapped to this host." />;
  }

  return <MenuPage data={menuQuery.data} />;
}

export const Route = createFileRoute("/")({
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getPublicMenuQueryOptions(context.trpc)).catch(() => {
      return undefined;
    });
  },
  component: HomePage,
});
