import { z } from "zod";

const httpsUrlSchema = z.url().refine((value) => value.startsWith("https://"));
const localizedTextSchema = z.object({ text: z.string().trim().min(1), languageCode: z.string().optional() });
const attributionSchema = z.object({ provider: z.string().trim().min(1), providerUri: httpsUrlSchema.optional() });
const candidateSchema = z.object({
  id: z.string().trim().min(1),
  displayName: localizedTextSchema,
  formattedAddress: z.string().trim().min(1),
  rating: z.number().min(0).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
  attributions: z.array(attributionSchema).optional(),
});
const responseSchema = z.object({ places: z.array(z.unknown()).default([]) });

export interface GooglePlaceCandidate {
  address: string;
  attributions: { provider: string; providerUri?: string }[];
  id: string;
  name: string;
  rating: number | null;
  ratingCount: number;
}

interface SearchGooglePlacesInput {
  apiKey: string;
  latitude: number | null;
  longitude: number | null;
  query: string;
}

export async function searchGooglePlaces({
  apiKey,
  latitude,
  longitude,
  query,
}: SearchGooglePlacesInput): Promise<{ attribution: string; candidates: GooglePlaceCandidate[] }> {
  const locationBias =
    latitude === null || longitude === null ? undefined : { circle: { center: { latitude, longitude }, radius: 500 } };
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    body: JSON.stringify({ textQuery: query, pageSize: 5, locationBias }),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.attributions",
    },
    method: "POST",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Google Places Text Search respondió con estado ${response.status}`);
  }

  const payload = responseSchema.parse(await response.json());
  const candidates = payload.places.flatMap((place): GooglePlaceCandidate[] => {
    const parsed = candidateSchema.safeParse(place);
    if (!parsed.success) return [];

    return [
      {
        address: parsed.data.formattedAddress,
        attributions: parsed.data.attributions ?? [],
        id: parsed.data.id,
        name: parsed.data.displayName.text,
        rating: parsed.data.rating ?? null,
        ratingCount: parsed.data.userRatingCount ?? 0,
      },
    ];
  });

  return { attribution: "Google Maps", candidates: candidates.slice(0, 5) };
}
