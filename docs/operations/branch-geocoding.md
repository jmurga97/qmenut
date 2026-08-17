# Branch geocoding and public maps

The public contact page renders OpenStreetMap tiles with Leaflet. It downloads Leaflet
only when at least one active branch has a valid latitude and longitude pair. MapTiler is
used only by the authenticated admin address autocomplete, and its key must never be
included in the web or admin bundles.

The raster map is styled as monochrome cartography blended with the tenant's `--qm-bg`
color. Markers and popups use the same theme tokens as the rest of the Lit UI. The branch
for the current domain is centered at zoom level 16 when it has coordinates. If it does
not, the map centers a single remaining marker, or fits multiple markers into view.

## Local setup

1. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` if the file does not exist.
2. Set `MAPTILER_API_KEY` to a MapTiler token that has access to the Geocoding API.
3. Start the API and admin applications normally.

Without the key, autocomplete reports that it is not configured. A branch can still be
saved with an address and no map location.

`GEOCODING_LIMITER` is declared in `apps/api/wrangler.jsonc` and permits 30 searches per
minute for each membership. Suggestions start after three characters, are limited to five
results, and request Spanish address, road, and POI results.

## Production rollout

Set the secret on the production API Worker:

```bash
bunx wrangler secret put MAPTILER_API_KEY --env production --cwd apps/api
```

Deploy in this order:

1. Apply the D1 migrations with `bun run --cwd apps/api db:migrate`.
2. Deploy the API, so that coordinates and geocoding are available.
3. Deploy admin and web.

Existing branches have no coordinates. An administrator must select an autocomplete result
to link an address to map coordinates. Editing the address, or selecting "Quitar ubicación
del mapa", clears both coordinates without removing the address.
