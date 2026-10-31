# Production checklist

Open items before public launch. Delete a line when it is done.

## Before a paying customer

- [ ] **Stripe live mode.** Live price IDs, live `STRIPE_SECRET_KEY`, live webhook + secret, and a Customer Portal that switches Basic ↔ Business.
- [ ] **Image pipeline.** qmenut policy in `ming-image-worker`, `qmenut-image-staging` + `qmenut-media`, prefix-filtered notification, CORS, 1-day lifecycle, signing credentials, `media.qmenut.app`. Every image save fails until this is done. See [Deployment](deployment.md#first-time-provisioning).

## Before public traffic

- [ ] **Security headers.** `apps/web/public/_headers` only sets asset caching. Add CSP, `X-Content-Type-Options`, `Referrer-Policy`, HSTS for the Sentry, PostHog, font and image origins in use.
- [ ] **Open Graph fallback.** Tenants without a branch photo all share `og-default.png`.
- [ ] **Backups.** Write down the D1 Time Travel / export policy and schedule a tested export + restore of `TENANT_THEME` KV.
- [ ] **Timezone at intake.** The tenant script defaults to `Europe/Madrid`; intake and admin must require the real zone outside Spain.
- [ ] **Digest unsubscribe.** Owners get the 15-day digest with no opt-out.
