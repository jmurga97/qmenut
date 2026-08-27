# Qmenut beta readiness

Product gaps that must be resolved before they are presented as available during the
Spain or Venezuela beta.

## Venezuela country and currency workflow

- [ ] Decide whether country belongs to the restaurant or each branch. Prefer branch
      country because a group may eventually operate across countries.
- [ ] Add an explicit ISO country code to the chosen business entity and collect it during
      onboarding.
- [ ] Confirm USD as the source price currency for Venezuelan beta branches: owners enter
      and maintain prices in USD without Qmenut rewriting those source amounts.
- [ ] Keep one visible currency at a time in the public interface. Add a currency selector
      beside the language selector so the guest can switch between USD and VES.
- [ ] Use the official BCV rate for any derived VES display, subject to local legal review.
      Define a resilient ingestion method, refresh frequency, rate timestamp, caching, and
      failure behavior. Never show a zero or silently use an undated stale rate.
- [ ] Design a safe bulk-price workflow before promising fast exchange-rate updates. The
      current menu editor stores item prices individually and has no bulk currency update.
- [ ] Ensure the public menu, admin editor, analytics, loyalty values, promotions, and
      future printable menu use one consistent currency contract.
- [ ] Validate Venezuelan price-display and invoicing requirements with appropriate local
      professional advice before launch.

## Public experience claims

- [ ] Audit cookies, local storage, service-worker storage, analytics, embedded content,
      and third-party integrations before claiming that the public experience needs no
      consent banner. Include the consent and storage used by loyalty. Re-run this audit
      when tracking or integrations change.
- [ ] Prefer the precise claim “sin banners de cookies de seguimiento” only while analytics
      remains cookieless and non-persistent; do not claim that the site stores nothing.
- [ ] Describe the experience as mobile-first and browser-based, not as lacking a desktop
      version.
- [ ] Keep commercial language claims limited to the languages supported by Qmenut's
      configured automatic translation provider. Do not sell a co-official language as an
      included automatic option unless it is supported and verified in the product.

## Printable menu

- [ ] Build and verify printable output from the same menu and theme data as the public
      experience.
- [ ] Do not demonstrate or list it as available until it is complete.

## Future transactional products

- [ ] Keep ordering, delivery, payments, and rider operations outside the core plan.
- [ ] Present delivery only as long-term product vision until scope, economics, pricing,
      operations, and launch timing are defined.
