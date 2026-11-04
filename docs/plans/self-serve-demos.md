# Self-serve demos: implementation plan

Status: designed (grilling session 2026-11-03), not started.

A restaurant signs up from `qmenut.app/empezar` in three steps, gets a 14-day **Business**
trial on `<slug>.qmenut.app` in **production**, no card. At day 14 the trial ends; the owner
converts through the existing Stripe checkout from the admin.

## Decisions

| Topic         | Decision                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Environment   | Production. Dev keeps `DEV_FIXED_OTP`, test-mode Stripe and rebuilds; conversion must not mean copying data between DBs.  |
| Card          | None at sign-up. Checkout after a trial gets **no** Stripe trial (no 28 free days).                                       |
| Form location | Landing, as one contained React island (`@astrojs/react`, `client:only`, `/empezar` only). Rest of landing stays JS-free. |
| Step order    | Email last. Nothing is written server-side until the OTP is verified.                                                     |
| Hosting       | Wildcard route `*.qmenut.app/*` on `qmenut-web` + proxied `*` DNS. Existing custom domains win. Reserved slug list.       |
| Initial menu  | Empty. Menu import from PDF/photo is phase 2, inside the admin.                                                           |
| Day 11        | Email "3 days left" with checkout link.                                                                                   |
| Day 14        | Subscription `canceled`, `branches.isActive = false` (public menu off), email "trial ended". Admin shows blocking modal.  |
| Deletion      | Manual, `qmenut-ops delete-tenant`. No automatic purge.                                                                   |
| Indexing      | Trial branches are `noindex`.                                                                                             |
| Legal data    | Not asked at sign-up; required in the conversion modal before Stripe.                                                     |
| Owner contact | `users.phone` (E.164) + optional marketing consent `users.marketing_consent_at`. Terms checkbox required.                 |
| Trial marker  | Explicit column `branch_subscriptions.trial_ends_at`. Ops-created `trialing` rows keep it `NULL` and never expire.        |
| Abuse         | Turnstile, per-IP rate limit, one trial per email forever, phone not verified.                                            |
| Staff alert   | Email per new trial via `ming-email-worker`.                                                                              |
| After OTP     | Redirect to `admin.qmenut.app/menu` with a trial banner and a short first-steps list.                                     |

## The form

| Step           | Fields                                                                                               | Right side                   |
| -------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1. Restaurante | Name · Country (ESP/VEN → currency, timezone, `es`) · Subdomain (from name, editable, live check)    | —                            |
| 2. Marca       | Template · Primary · Secondary · Logo (optional, thumbnail only)                                     | Live preview (template host) |
| 3. Cuenta      | Name · Email · Phone (prefix from country) · ☐ Terms (required) · ☐ Marketing (optional) · Turnstile | —                            |

Preview before the tenant exists: iframe `https://<template>.qmenut.app/?themePreview=…` and post
the draft with `createThemePreviewUpdateMessage` from `@qmenut/ui/theme/tenant-theme-config`
(the shared protocol already lives there). The landing writes its own small iframe component
instead of moving the admin's `ThemePreview` (it depends on admin i18n). The logo is not sent to
the preview: `blob:` URLs don't cross origins.

## Phase 0: prerequisites (Cloudflare + ops, no code)

- [ ] The five template tenants in **production**: `fine`, `her`, `fast`, `cafe`, `tapas` `.qmenut.app`
      (`qmenut-ops tenant:create` + `tenant:load-content --env production`). Point
      `apps/landing/src/lib/content.ts` demo links at them.
- [ ] `*` DNS record (proxied) and route `*.qmenut.app/*` → `qmenut-web` in `apps/web/wrangler.jsonc`
      (production). Check that `api`, `admin`, `lab`, `referidos`, `media`, `email-hooks`, `www` and the apex still hit their Workers.
- [ ] Turnstile widget for `qmenut.app` → site key (landing build var), secret (`wrangler secret put TURNSTILE_SECRET_KEY`).
- [ ] `ming-email-worker` templates: `trial-ending` (day 11), `trial-ended` (day 14), `trial-created` (staff).
- [ ] Terms page for trials + privacy update (phone, marketing) in `apps/landing/src/pages/[legal].astro`.

## Phase 1: schema

One migration: `bun run db:generate -- --name self_serve_trials`.

- `users.phone` text null
- `users.marketing_consent_at` integer null
- `branch_subscriptions.trial_ends_at` integer null

## Phase 2: API (`apps/api`)

New public module `modules/signup/`:

- `checkSubdomain({ slug })`: normalize, reject reserved slugs (`api admin www lab referidos media dev email-hooks app mail …`)
  and taken hosts. Rate-limited.
- `requestOtp({ email, turnstileToken })`: verify Turnstile, `SIGNUP_LIMITER` (namespace 1006 prod / 2006 dev),
  refuse emails that already have a user ("Ya tienes cuenta → entrar"), send OTP.
- `createTrial({ otp, restaurant, theme, owner })`: verify OTP, then in one go create user (with phone and consent),
  restaurant, branch (`customDomain = <slug>.qmenut.app`, `planCode = business`), owner membership, support accounts
  (same as ops), `branch_subscriptions` row `trialing` + `trial_ends_at = now + 14d`, theme + `menuVersion` in KV
  (`tenant-theme-store.ts`), open the session, send the staff email. Roll back KV if D1 fails (same as ops).
- **Spike first:** Better Auth runs with `emailOTP({ disableSignUp: true })`. Confirm how to check an OTP for an
  email that has no user yet and open a session afterwards, using the installed Better Auth version, before writing `createTrial`.
- Origins: add `https://qmenut.app` to `ALLOWED_ORIGINS` and the Better Auth trusted origins (prod). The cookie stays on `api.qmenut.app`.
- Logo: after `createTrial`, the island uploads it through the existing image endpoints with the new session.

Billing changes:

- `create-checkout-session.ts`: no Stripe trial when the row has `trial_ends_at`.
- `sync-subscription-state.ts`: on `active`/`trialing` from Stripe, set `branches.isActive = true` and bump the content version.
- Daily cron (`45 4 * * *`, `index.ts`):
  - `trial_ends_at` in `(now + 2d, now + 3d]` and no Stripe ID → `trial-ending` email. One daily run means one send.
    `ponytail:` window-based, add a `reminder_sent_at` if the cron ever runs more than once a day.
  - `trial_ends_at <= now`, still `trialing`, no Stripe ID → `canceled`, `isActive = false`, bump version, `trial-ended` email.

## Phase 3: web (`apps/web`)

- `use-theme-preview.ts`: accept `https://qmenut.app` as well as the admin origin.
- `noindex` for trial branches: expose a trial flag in the public payload, use it in `build-page-head.ts` and `robots[.]txt.ts`.

## Phase 4: landing (`apps/landing`)

- Add `@astrojs/react`, `react`, `react-dom`. Island only in `empezar.astro` (`client:only="react"`).
- Three steps as above, form state in one component, Turnstile widget, OTP input, preview iframe.
- On success: upload logo → redirect to `https://admin.qmenut.app/menu`.

## Phase 5: admin (`apps/admin`)

- Trial banner: "Te quedan N días · Activar plan" while `trial_ends_at` is in the future.
- First-steps list on `/menu`: first dish, photos, QR.
- After expiry: blocking modal → legal data (the four fields from Sucursal) → plan choice → existing checkout.

## Phase 6: docs

`docs/domains/billing.md` (trial rules, cron), `custom-domains.md` (wildcard route), `operations/deployment.md`
(Turnstile, limiter, DNS), `operations/onboarding-intake.md` (self-serve vs ops).

## Out of scope

- Menu import from PDF/photo (phase 2, admin): vision LLM as extractor; TypeSafe Jev only to flag allergens for review.
- Automatic deletion of expired trials.
- SMS verification of the phone.

## Suggested PR order

1. Phase 0 + 1 (infra + migration)
2. Phase 2 (API, after the Better Auth spike)
3. Phase 3 + 5 (web + admin)
4. Phase 4 (landing) and docs
