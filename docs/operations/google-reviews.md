# Google reviews operations

The public contact page can read reviews for one Google Place per branch. The Place ID is
stored in D1; review content is fetched on demand and is never written to D1, KV, the public
menu cache, SSR data, or the service-worker cache.

## Google Cloud setup

1. Enable **Places API (New)** in the Google Cloud project used by the API Worker.
2. Create an API key, or reuse the one that already powers branch address autocomplete —
   both features share `GOOGLE_PLACES_API_KEY`.
3. Restrict the key's API targets to **Places API (New)** only.
4. Store it as `GOOGLE_PLACES_API_KEY` in each Worker environment:

   ```bash
   bunx wrangler secret put GOOGLE_PLACES_API_KEY --env development --cwd apps/api
   bunx wrangler secret put GOOGLE_PLACES_API_KEY --env production --cwd apps/api
   ```

5. In Google Cloud Billing, create budget alerts for the project at thresholds appropriate
   to the account (for example 50%, 80%, and 100% of the monthly budget).
6. In Google Maps Platform quotas, set daily request limits for Autocomplete (New), Text
   Search (New), and Place Details (New). Start from expected traffic plus a deliberate
   safety margin and revisit the values after observing production usage. Place Details
   requests that include reviews use the Enterprise + Atmosphere billing tier.

The Worker also applies `PUBLIC_REVIEWS_LIMITER` per branch and visitor IP before calling
Place Details. This protects the upstream quota, but it does not replace Google Cloud budgets
and quotas.

## Runtime behavior

- Disabled or unconnected branches return `null` without contacting Google.
- Search results are transient. Only the selected Place ID and the enabled flag are stored.
- Public review responses use `Cache-Control: no-store` and a single five-second upstream
  request with no retry.
- Changing the connection or enabled state bumps that branch's public-content version.
- Google review content and author data must not be added to logs or analytics.

Follow the current [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies?hl=en)
and [Place resource reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)
when changing the fields or presentation.
