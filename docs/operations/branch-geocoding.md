# Branch address maps and public maps

The public contact page renders OpenStreetMap tiles with Leaflet. It downloads Leaflet
only when at least one active branch has a valid latitude and longitude pair. Google's
Places API is used only by the authenticated admin address autocomplete, and its key must
never be included in the web or admin bundles.

The raster map is styled as monochrome cartography blended with the tenant's `--qm-bg`
color. Markers and popups use the same theme tokens as the rest of the Lit UI. The branch
for the current domain is centered at zoom level 16 when it has coordinates. If it does
not, the map centers a single remaining marker, or fits multiple markers into view.

## How the admin captures coordinates

The "Dirección" field on branch settings is a combobox backed by **Places API (New)**
(`google-places-autocomplete.service.ts`), in two steps:

1. As the administrator types (after three characters, 350 ms debounce), the API Worker
   calls `POST https://places.googleapis.com/v1/places:autocomplete` with
   `includedPrimaryTypes: ["address"]`, `languageCode: "es"`, and a `locationBias` circle
   around the branch's current coordinates when it already has them. It returns up to five
   predictions (place id + display text). Autocomplete responses carry **no coordinates**.
2. When the administrator picks a prediction, the API Worker calls
   `GET https://places.googleapis.com/v1/places/{placeId}` with
   `X-Goog-FieldMask: id,location,formattedAddress`. The `location` is written to the
   branch form as `latitude` / `longitude`. The address text keeps the prediction's own
   text — it is not overwritten with `formattedAddress`.

A single **session token** (a UUIDv4 generated in the admin) is sent on every autocomplete
request and on the final Place Details request, then rotated after each selection. Google
bills the autocomplete-plus-details pair as one session instead of per request.

## Google Cloud setup

Before the autocomplete can run:

1. Create or pick a Google Cloud project with billing enabled.
2. Enable **Places API (New)** on that project.
3. Create an API key and restrict it to **Places API (New)** only. Application
   restrictions are not practical for Workers because they have no static egress IPs; the
   API restriction plus the server-side placement of the key are the controls. The same
   key also powers the Google reviews lookup (see `google-reviews.md`).
4. Set daily quota caps for Autocomplete (New) and Place Details (New) as cost
   guardrails.

## Local setup

1. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` if the file does not exist.
2. Set `GOOGLE_PLACES_API_KEY` to a key with **Places API (New)** enabled.
3. Start the API and admin applications normally.

Without the key, autocomplete reports that it is not configured. A branch can still be
saved with an address and no map location. If Place Details fails after a prediction is
chosen, the combobox says so and the address text is still saved without coordinates.

`GEOCODING_LIMITER` is declared in `apps/api/wrangler.jsonc` and permits 30 lookups per
minute for each membership (shared by the autocomplete and the Place Details procedures).
Suggestions start after three characters, return at most five results, and request
Spanish results. The service returns the fixed attribution "Con tecnología de Google",
which the admin combobox shows below the suggestions as required by the Google Maps
Platform terms when Places content is displayed without a Google map.

## Production rollout

Set the secret on the production API Worker:

```bash
bunx wrangler secret put GOOGLE_PLACES_API_KEY --env production --cwd apps/api
```

Deploy in this order:

1. Apply the D1 migrations with
   `bun run --cwd apps/api db:migrate -- --confirm-production`.
2. Deploy the API, so that coordinates and address autocomplete are available.
3. Deploy admin and web.

Existing branches have no coordinates. An administrator must select an autocomplete result
to link an address to map coordinates. Editing the address, or selecting "Quitar ubicación
del mapa", clears both coordinates without removing the address.

## Compliance notes

- Persisted coordinates become business data; `placeId` is exempt from the Google caching
  restrictions, which is why predictions identify results by their place id.
- For customers with a billing address in the European Economic Area, the EEA service
  terms restrict using a Google-formatted address together with any non-Google map. The
  stored address is the prediction text the administrator selected, not Place Details'
  `formattedAddress`; administrators can retype it if stricter separation is required.
