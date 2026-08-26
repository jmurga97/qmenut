import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import "./google-reviews.css";
import { track } from "~/lib/analytics/posthog";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type GoogleReviews = NonNullable<inferRouterOutputs<AppRouter>["menu"]["googleReviews"]>;
type GoogleReview = GoogleReviews["reviews"][number];

function StarRating({ label, value }: { label: string; value: number }) {
  const percentage = `${Math.max(0, Math.min(100, (value / 5) * 100))}%`;
  return (
    <span aria-label={label} className="google-stars" role="img">
      <span aria-hidden="true" className="google-stars__base">
        ★★★★★
      </span>
      <span aria-hidden="true" className="google-stars__fill" style={{ inlineSize: percentage }}>
        ★★★★★
      </span>
    </span>
  );
}

function formatPublishedAt(review: GoogleReview, locale: string): string {
  if (review.publicationLabel) return review.publicationLabel;
  const date = new Date(review.publishedAt);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function formatVisitDate(review: GoogleReview, locale: string): string | null {
  if (!review.visitDate) return null;
  const date = new Date(Date.UTC(review.visitDate.year, review.visitDate.month - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC", year: "numeric" }).format(date);
}

export function GoogleRatingSummary({ data }: { data: GoogleReviews }) {
  const { t } = useTranslation();
  return (
    <div className="google-rating-summary">
      <p className="google-rating-summary__eyebrow">{t("contact.reviews.googleRating")}</p>
      {data.rating === null || data.ratingCount === 0 ? (
        <div className="google-rating-summary__empty">{t("contact.reviews.beFirst")}</div>
      ) : (
        <>
          <div className="google-rating-summary__number">
            {data.rating.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </div>
          <StarRating label={t("contact.reviews.ratingOutOfFive", { rating: data.rating })} value={data.rating} />
          <p className="google-rating-summary__count">
            {t("contact.reviews.ratingCount", { count: data.ratingCount })}
          </p>
        </>
      )}
      {data.writeReviewUrl ? (
        <a
          className="google-rating-summary__cta"
          href={data.writeReviewUrl}
          onClick={() => track("google_reviews_cta_clicked")}
          rel="noreferrer"
          target="_blank"
        >
          {t("contact.reviews.leaveReview")} <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}

export function GoogleReviewCard({ review }: { review: GoogleReview }) {
  const { i18n, t } = useTranslation();
  const authorName = review.author.name ?? t("contact.reviews.googleReviewer");
  const publishedAt = formatPublishedAt(review, i18n.language);
  const visitDate = formatVisitDate(review, i18n.language);
  const authorContent = (
    <>
      {review.author.avatarUrl ? (
        <img
          alt=""
          className="google-review-card__avatar"
          height="44"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={review.author.avatarUrl}
          width="44"
        />
      ) : (
        <span aria-hidden="true" className="google-review-card__avatar google-review-card__avatar--fallback">
          {authorName.slice(0, 1).toLocaleUpperCase()}
        </span>
      )}
      <span className="google-review-card__author-copy">
        <strong>{authorName}</strong>
        {publishedAt ? <span>{publishedAt}</span> : null}
      </span>
    </>
  );

  return (
    <article className="google-review-card">
      <header className="google-review-card__author">
        {review.author.profileUrl ? (
          <a href={review.author.profileUrl} rel="noreferrer" target="_blank">
            {authorContent}
          </a>
        ) : (
          <div>{authorContent}</div>
        )}
      </header>
      <StarRating label={t("contact.reviews.ratingOutOfFive", { rating: review.stars })} value={review.stars} />
      {visitDate ? (
        <p className="google-review-card__visit">{t("contact.reviews.visited", { date: visitDate })}</p>
      ) : null}
      {review.text ? <p className="google-review-card__text">{review.text}</p> : null}
      {review.translated ? (
        <details className="google-review-card__translation">
          <summary>{t("contact.reviews.translated")}</summary>
          {review.originalText ? <p>{review.originalText}</p> : null}
        </details>
      ) : null}
      <a className="google-review-card__source" href={review.sourceUrl} rel="noreferrer" target="_blank">
        {t("contact.reviews.readOnGoogle")} <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}

function ReviewsSkeleton() {
  const { t } = useTranslation();
  return (
    <section aria-label={t("contact.reviews.loading")} className="google-reviews google-reviews--loading" role="status">
      <div className="google-reviews__skeleton-card" />
    </section>
  );
}

export function GoogleReviewsSection() {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { data, isError, isPending } = useQuery({
    ...trpc.menu.googleReviews.queryOptions({ host, locale }),
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 0,
  });
  const tracked = useRef(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!data || tracked.current) return;
    tracked.current = true;
    track("google_reviews_loaded", { rating_count: data.ratingCount, review_count: data.reviews.length });
  }, [data]);

  if (isPending) return <ReviewsSkeleton />;
  if (isError || !data) return null;

  return (
    <section aria-labelledby="google-reviews-heading" className="google-reviews">
      <h2 className="google-reviews__heading" id="google-reviews-heading">
        {t("contact.reviews.heading")}
      </h2>
      <div className="google-reviews__rail" tabIndex={data.reviews.length > 0 ? 0 : undefined}>
        <GoogleRatingSummary data={data} />
        {data.reviews.map((review) => (
          <GoogleReviewCard key={review.sourceUrl} review={review} />
        ))}
      </div>
      <div className="google-reviews__attribution">
        <span className="google-reviews__google-attribution" translate="no">
          Google Maps
        </span>
        <span>{t("contact.reviews.relevanceNotice")}</span>
        {data.reviewsUrl ? (
          <a href={data.reviewsUrl} rel="noreferrer" target="_blank">
            {t("contact.reviews.allReviews")}
          </a>
        ) : null}
      </div>
    </section>
  );
}
