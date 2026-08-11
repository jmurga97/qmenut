# Branch geocoding and public maps

The public contact page renders OpenStreetMap tiles with Leaflet. It only downloads Leaflet
when at least one active branch has a valid latitude/longitude pair. MapTiler is used only by
the authenticated admin address autocomplete; its key must never be exposed to the web or
admin bundles.

The raster map is styled as monochrome cartography blended with the tenant's `--qm-bg`; markers
and popups consume the same theme tokens as the rest of the Lit UI. The current domain's branch
is centered at zoom 16 when it has coordinates. If it does not, one remaining marker is centered
or multiple markers are fitted into view.

## Local setup

1. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars` if needed.
2. Set `MAPTILER_API_KEY` to a MapTiler token with Geocoding API access.
3. Start the API and admin normally. Without the key, autocomplete reports that it is not
   configured, while the branch can still be saved with an address and no map location.

`GEOCODING_LIMITER` is declared in `apps/api/wrangler.jsonc` and permits 30 searches per
minute for each membership. Suggestions start after three characters, are limited to five,
and request Spanish address, road, and POI results.

## Production rollout

Set the secret on the production API Worker:

```bash
cd apps/api
bunx wrangler secret put MAPTILER_API_KEY --env production
```

Deploy in this order:

1. Apply D1 migrations with `bun run --cwd apps/api db:migrate`.
2. Deploy the API so coordinates and geocoding are available.
3. Deploy admin and web.

Existing branches remain un-geocoded. An administrator must select an autocomplete result to
link an address to map coordinates. Editing the address or selecting “Quitar ubicación del
mapa” clears both coordinates without removing the address.
