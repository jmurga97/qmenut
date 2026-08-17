import { z } from "zod";

const coordinateSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

const featureSchema = z.object({
  center: coordinateSchema,
  id: z.string().min(1).max(200),
  place_name: z.string().trim().min(1).max(500),
});

const responseSchema = z.object({
  attribution: z.string().trim().min(1).max(2000),
  features: z.array(z.unknown()).max(10),
});

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

interface SearchMaptilerAddressesInput {
  apiKey: string;
  query: string;
}

export async function searchMaptilerAddresses({
  apiKey,
  query,
}: SearchMaptilerAddressesInput): Promise<AddressSuggestionsResult> {
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "es");
  url.searchParams.set("limit", "5");
  url.searchParams.set("types", "address,road,poi");

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

  if (!response.ok) {
    throw new Error(`MapTiler respondió con estado ${response.status}`);
  }

  const payload = responseSchema.parse(await response.json());
  const suggestions = payload.features
    .flatMap((feature): AddressSuggestion[] => {
      const parsed = featureSchema.safeParse(feature);
      if (!parsed.success) return [];

      const [longitude, latitude] = parsed.data.center;
      return [
        {
          id: parsed.data.id,
          label: parsed.data.place_name,
          latitude,
          longitude,
        },
      ];
    })
    .slice(0, 5);

  return { attribution: payload.attribution, suggestions };
}
