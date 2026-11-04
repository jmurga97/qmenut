# Landing markets

The landing offers Spanish and Venezuelan versions at `/es/` and `/ve/`. The root and the legacy `/precios` and `/empezar` URLs send visitors to their market with a temporary redirect, read from Cloudflare's `CF-IPCountry` header. Legacy URLs fall back to Venezuela; the root shows a market chooser to everyone else, crawlers included.

Basic and Business are presented at 15 and 55 per month in EUR for Spain and USD for Venezuela, with taxes additional, as decided for the landing. Stripe currently has one configured price per plan, not one per market: align Stripe and the commercial flow before enabling public signup. `/empezar` is a placeholder and cannot start a trial. Every contact button opens WhatsApp with a prefilled message; the numbers in `apps/landing/src/lib/markets.ts` are placeholders until the real lines exist. Nisia's permission to feature it is pending. The landing's legal pages also need their final content before launch.
