# Branch geocoding and public maps

The public contact page renders OpenStreetMap tiles with Leaflet. It downloads Leaflet
only when at least one active branch has a valid latitude and longitude pair. The Google
Geocoding API is used only by the authenticated admin address autocomplete, and its key
must never be included in the web or admin bundles.

The raster map is styled as monochrome cartography blended with the tenant's `--qm-bg`
color. Markers and popups use the same theme tokens as the rest of the Lit UI. The branch
for the current domain is centered at zoom level 16 when it has coordinates. If it does
not, the map centers a single remaining marker, or fits multiple markers into view.

## Google Cloud setup

The autocomplete calls the Geocoding web service from the API Worker
(`google-geocoding.service.ts`). Before it can run:

1. Create or pick a Google Cloud project with billing enabled.
2. Enable the **Geocoding API** on that project.
3. Create an API key and restrict it to the **Geocoding API** only. Application
   restrictions are not practical for Workers because they have no static egress IPs;
   the API restriction plus the server-side placement of the key are the controls.
4. Optionally set a quota cap on the key as a cost guardrail.

## Local setup

1. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` if the file does not exist.
2. Set `GOOGLE_MAPS_API_KEY` to a key restricted to the Geocoding API.
3. Start the API and admin applications normally.

Without the key, autocomplete reports that it is not configured. A branch can still be
saved with an address and no map location.

`GEOCODING_LIMITER` is declared in `apps/api/wrangler.jsonc` and permits 30 searches per
minute for each membership. Suggestions start after three characters, return at most five
results, and request Spanish results. The service returns the fixed attribution
"Google Maps", which the admin combobox shows below the suggestions as required by the
Google Maps Platform terms when geocoding content is displayed without a Google map.

## Production rollout

Set the secret on the production API Worker:

```bash
bunx wrangler secret put GOOGLE_MAPS_API_KEY --env production --cwd apps/api
```

Deploy in this order:

1. Apply the D1 migrations with
   `bun run --cwd apps/api db:migrate -- --confirm-production`.
2. Deploy the API, so that coordinates and geocoding are available.
3. Deploy admin and web.

Existing branches have no coordinates. An administrator must select an autocomplete result
to link an address to map coordinates. Editing the address, or selecting "Quitar ubicación
del mapa", clears both coordinates without removing the address.

## Compliance notes

- Persisted coordinates become business data; `place_id` is exempt from the Google
  caching restrictions, which is why suggestions identify results by `place_id`.
- For customers with a billing address in the European Economic Area, the EEA service
  terms restrict using geocoded formatted addresses together with any non-Google map.
  Administrators can retype the address text after picking a suggestion if stricter
  separation is required.
