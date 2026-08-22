import { z } from "zod";

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const geometrySchema = z.object({
  location: locationSchema,
});

const resultSchema = z.object({
  formatted_address: z.string().trim().min(1).max(500),
  geometry: geometrySchema,
  place_id: z.string().trim().min(1).max(500),
});

const responseSchema = z.object({
  error_message: z.string().optional(),
  results: z.array(z.unknown()).default([]),
  status: z.string().trim(),
});

const SUCCESS_STATUSES = new Set(["OK", "ZERO_RESULTS"]);

export interface AddressSuggestion {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

export interface AddressSuggestionsResult {
  attribution: string;
  suggestions: AddressSuggestion[];
}

interface SearchGoogleAddressesInput {
  apiKey: string;
  query: string;
}

export async function searchGoogleAddresses({
  apiKey,
  query,
}: SearchGoogleAddressesInput): Promise<AddressSuggestionsResult> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocoding/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "es");

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

  if (!response.ok) {
    throw new Error(`Google Geocoding respondió con estado ${response.status}`);
  }

  const payload = responseSchema.parse(await response.json());

  if (!SUCCESS_STATUSES.has(payload.status)) {
    const detail = payload.error_message ? `: ${payload.error_message}` : "";
    throw new Error(`Google Geocoding respondió con estado ${payload.status}${detail}`);
  }

  const suggestions = payload.results
    .flatMap((result): AddressSuggestion[] => {
      const parsed = resultSchema.safeParse(result);
      if (!parsed.success) return [];

      return [
        {
          id: parsed.data.place_id,
          label: parsed.data.formatted_address,
          latitude: parsed.data.geometry.location.lat,
          longitude: parsed.data.geometry.location.lng,
        },
      ];
    })
    .slice(0, 5);

  return { attribution: "Google Maps", suggestions };
}
