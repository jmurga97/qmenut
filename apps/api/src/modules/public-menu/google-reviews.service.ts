import { z } from "zod";

const httpsUrlSchema = z.url().refine((value) => value.startsWith("https://"));
const localizedTextSchema = z.object({
  languageCode: z.string().optional(),
  text: z.string(),
});
const authorSchema = z.object({
  displayName: z.string().trim().min(1).optional(),
  photoUri: httpsUrlSchema.optional(),
  uri: httpsUrlSchema.optional(),
});
const visitDateSchema = z.object({
  day: z.number().int().min(0).max(31).optional(),
  month: z.number().int().min(0).max(12).optional(),
  year: z.number().int().min(0).max(9999).optional(),
});
const reviewSchema = z.object({
  authorAttribution: authorSchema.optional(),
  googleMapsUri: httpsUrlSchema,
  originalText: localizedTextSchema.optional(),
  publishTime: z.string(),
  rating: z.number().min(0).max(5),
  relativePublishTimeDescription: z.string().optional(),
  text: localizedTextSchema.optional(),
  visitDate: visitDateSchema.optional(),
});
const placeDetailsSchema = z.object({
  googleMapsLinks: z
    .object({
      placeUri: httpsUrlSchema.optional(),
      reviewsUri: httpsUrlSchema.optional(),
      writeAReviewUri: httpsUrlSchema.optional(),
    })
    .optional(),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.array(z.unknown()).default([]),
  userRatingCount: z.number().int().nonnegative().optional(),
});

export interface GoogleReview {
  author: {
    avatarUrl: string | null;
    name: string | null;
    profileUrl: string | null;
  };
  originalText: string | null;
  originalTextLanguage: string | null;
  publicationLabel: string | null;
  publishedAt: string;
  sourceUrl: string;
  stars: number;
  text: string;
  textLanguage: string | null;
  translated: boolean;
  visitDate: { month: number; year: number } | null;
}

export interface GoogleReviewsResult {
  rating: number | null;
  ratingCount: number;
  reviews: GoogleReview[];
  reviewsUrl: string | null;
  writeReviewUrl: string | null;
}

interface GetGoogleReviewsInput {
  apiKey: string;
  locale?: string;
  placeId: string;
}

function mapReview(value: unknown): GoogleReview | null {
  const parsed = reviewSchema.safeParse(value);
  if (!parsed.success) return null;

  const review = parsed.data;
  const text = review.text?.text ?? review.originalText?.text ?? "";
  const originalText = review.originalText?.text ?? null;
  const textLanguage = review.text?.languageCode ?? null;
  const originalTextLanguage = review.originalText?.languageCode ?? null;
  const translated =
    originalText !== null &&
    (originalText !== text ||
      (textLanguage !== null && originalTextLanguage !== null && textLanguage !== originalTextLanguage));
  const visitDate =
    review.visitDate?.year && review.visitDate.month
      ? { month: review.visitDate.month, year: review.visitDate.year }
      : null;

  return {
    author: {
      avatarUrl: review.authorAttribution?.photoUri ?? null,
      name: review.authorAttribution?.displayName ?? null,
      profileUrl: review.authorAttribution?.uri ?? null,
    },
    originalText,
    originalTextLanguage,
    publicationLabel: review.relativePublishTimeDescription ?? null,
    publishedAt: review.publishTime,
    sourceUrl: review.googleMapsUri,
    stars: review.rating,
    text,
    textLanguage,
    translated,
    visitDate,
  };
}

export async function getGoogleReviews({
  apiKey,
  locale,
  placeId,
}: GetGoogleReviewsInput): Promise<GoogleReviewsResult> {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (locale) url.searchParams.set("languageCode", locale);

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsLinks",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Google Places Details respondió con estado ${response.status}`);
  }

  const place = placeDetailsSchema.parse(await response.json());
  return {
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? 0,
    reviews: place.reviews
      .flatMap((review) => {
        const mapped = mapReview(review);
        return mapped ? [mapped] : [];
      })
      .slice(0, 5),
    reviewsUrl: place.googleMapsLinks?.reviewsUri ?? place.googleMapsLinks?.placeUri ?? null,
    writeReviewUrl: place.googleMapsLinks?.writeAReviewUri ?? null,
  };
}
