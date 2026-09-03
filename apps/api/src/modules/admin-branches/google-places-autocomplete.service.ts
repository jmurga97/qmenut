import { z } from "zod";

const localizedTextSchema = z.object({ text: z.string().trim().min(1) });

const predictionSchema = z.object({
  placeId: z.string().trim().min(1),
  text: localizedTextSchema,
});

const autocompleteResponseSchema = z.object({ suggestions: z.array(z.unknown()).default([]) });

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const detailsResponseSchema = z.object({
  id: z.string().trim().min(1),
  formattedAddress: z.string().trim().min(1),
  location: locationSchema,
});

const ATTRIBUTION = "Con tecnología de Google";

export interface AddressPrediction {
  id: string;
  label: string;
}

export interface AddressPredictionsResult {
  attribution: string;
  suggestions: AddressPrediction[];
}

export interface PlaceLocation {
  address: string;
  id: string;
  latitude: number;
  longitude: number;
}

interface AutocompleteAddressesInput {
  apiKey: string;
  latitude: number | null;
  longitude: number | null;
  query: string;
  sessionToken: string;
}

export async function autocompleteAddresses({
  apiKey,
  latitude,
  longitude,
  query,
  sessionToken,
}: AutocompleteAddressesInput): Promise<AddressPredictionsResult> {
  const locationBias =
    latitude === null || longitude === null
      ? undefined
      : { circle: { center: { latitude, longitude }, radius: 50_000 } };
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    body: JSON.stringify({
      input: query,
      includedPrimaryTypes: ["address"],
      languageCode: "es",
      locationBias,
      sessionToken,
    }),
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
    method: "POST",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Google Places Autocomplete respondió con estado ${response.status}`);
  }

  const payload = autocompleteResponseSchema.parse(await response.json());
  const suggestions = payload.suggestions
    .flatMap((suggestion): AddressPrediction[] => {
      const prediction = (suggestion as { placePrediction?: unknown }).placePrediction;
      const parsed = predictionSchema.safeParse(prediction);
      if (!parsed.success) return [];

      return [{ id: parsed.data.placeId, label: parsed.data.text.text }];
    })
    .slice(0, 5);

  return { attribution: ATTRIBUTION, suggestions };
}

interface GetPlaceLocationInput {
  apiKey: string;
  placeId: string;
  sessionToken: string;
}

export async function getPlaceLocation({
  apiKey,
  placeId,
  sessionToken,
}: GetPlaceLocationInput): Promise<PlaceLocation> {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "es");
  url.searchParams.set("sessionToken", sessionToken);

  const response = await fetch(url, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "id,location,formattedAddress" },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Google Place Details respondió con estado ${response.status}`);
  }

  const place = detailsResponseSchema.parse(await response.json());

  return {
    address: place.formattedAddress,
    id: place.id,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
  };
}
