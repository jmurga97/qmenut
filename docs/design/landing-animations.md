# Landing animations

How the motion on the landing (`apps/landing`, `/es` and `/ve`) is built, and why it is built that way.

## The idea

The landing tells one continuous story with the menu's own components. The hero draws the market's menu as a
wireframe lying flat; the first scroll lifts it apart, one component per sheet. The story then prints those same
components, cut from real captures, into an exploded stack that stays pinned beside the feature copy and lifts the
component each feature talks about. The templates close the story. Every frame shows the real product: no generated
images, no video, no device mockups.

Motion only exists when it explains something (what changes when you change the rate, which part of the menu a
feature touches). Anything decorative was cut.

## Rules

| Rule                       | Why                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS only                   | `position: sticky` + `animation-timeline: scroll()/view()`. No GSAP, three.js or runtime libraries: the landing ships no JS framework and must stay light. |
| Scroll-driven, not -jacked | The page always scrolls freely: no snapping, no wheel hijacking. Pinned elements only hold still while their track scrolls past.                           |
| Flat planes in 3D          | Perspective on flat sheets only: no shadows, no lighting. It is the one approved exception to Ming's flat look, and it reads as print production.          |
| Phone as a hairline        | 1px frame, 4px corners. Not a device mockup.                                                                                                               |
| Stills as the fallback     | `prefers-reduced-motion: reduce` and browsers without `animation-timeline` get every final state as a still (hero already taken apart, stack assembled).   |
| Composite properties       | Only `transform`/`translate`/`scale`, `opacity`, `clip-path` and `filter`. Never layout properties.                                                        |

## Pieces

All motion lives in `src/styles/showcase.css`; the markup in `src/components/hero-wire.astro`,
`layer-stack.astro` and `showcase-story.astro`; the only script in `src/lib/showcase-controller.ts`.

### Hero wireframe (`hero-wire.astro`)

- `.print-hero` is 190svh tall with a sticky inner area and names the `--print` view timeline.
- Each component sheet (header, featured dish, categories, section, dish rows, dish card, bottom nav) runs
  `wire-lift` over 26% of `--print`, staggered by 8% per sheet (`--at`). The first pixels of scroll already lift
  the header, so the page answers the reader immediately.
- Easing is `cubic-bezier(0.33, 1, 0.68, 1)`, softer than the UI curve on purpose: on a scrubbed animation a strong
  ease-out moves almost everything in the first pixels and feels disconnected from the hand.
- `wire-exit` (`exit 0%` → `exit 40%` of `--print`) fades and shrinks the wireframe as the story stack rises below,
  so the reader sees one model handing over, never two at once.

### Story stack (`layer-stack.astro`)

- `--build` is a registered `@property` (0 → 1). Each `.plane` derives its own print progress `--p` from it, staggered
  by `--i`, so sheets print in top first; `--tilt` and `--gap` derive from it too, so one number drives the whole
  assembly.
- Desktop: `.story-block` names `--story`; `stack-build` runs `entry 10%` → `entry 90%`, so the stack is fully printed
  by the time it pins and the first feature is never explained over a half-built menu.
- Mobile (< 64rem): no pinning. Each section renders its own `.stack--inline`, assembled on `view()`
  (`entry 30%` → `cover 55%`).
- Components are cut from the 2x captures with `clip-path` bands (`stackCaptures` in `src/lib/showcase.ts`). Every
  painted box is cut to its band because Chrome drops full-page planes that a 3D riser crosses.

### Steps (the only JavaScript)

Scroll timelines can't say "which feature is being read", so `showcase-controller.ts` does: on `scroll`
(rAF-throttled) it picks the last feature whose top passed 55% of the viewport, sets `data-active` on it and
`data-step="<stage>:<index>"` on the stack, and toggles `data-on` on every element whose `data-for` lists that step.
CSS reacts to those attributes with transitions. On mobile an `IntersectionObserver` (60%) sets `data-live` instead.

Timing for step changes, shared by every stage:

- `--ease: cubic-bezier(0.16, 1, 0.3, 1)` (on `.stack`). Transforms 600ms, opacity 300ms.
- Delays only on enter, never on exit, at most ~300ms. Going back up snaps back without delays: the asymmetry is
  intended, the reader has already seen it.
- Interruptible: transitions, not keyframes, wherever the reader can scroll back mid-change. The VE rate sequence is
  the exception: it is keyframed because its parts must play in order.

### Feature copy (desktop)

The section title and the active feature are sticky; each `li` is a 60svh track. The copy steps while the stack
scrubs. Direction follows the scroll: read features leave upward (`-0.5rem`), unread ones wait below (`0.75rem`).
Exit is fast (150ms), entry waits for it (300ms, 60ms delay), so two features never overlap. `feature-leave` uses
`filter` rather than `opacity` so it doesn't fight the active/inactive opacity transition.

### Stage details

- **Domain**: the address bar types the domain with `steps()` sized to its length (`--chars`, mono font).
- **VE rate**: cause → effect. The old rate is struck through, the new one arrives, the hairline dots pulse, then
  the bolívar lines swap (at 1200ms). It waits at its start (`data-motion` without `data-live`) until the reader
  actually reaches the block, otherwise it would play off screen. The rate is today's BCV rate from the
  `EXCHANGE_RATE_WORKER` binding (fixture rate 35 as fallback); prices are painted over the `rate:0` capture.
- **Admin cards** join the dish rows with hairlines that rise (`rotateX(90deg)`) to the row's sheet.
- **Stamps**: one stamp press. **Views**: the dish card slides up.

### Templates and dialog

- Contact cards lie flat like a contact sheet and stand up on hover (450ms) or focus, lie back down faster (250ms).
  Hover is gated to `(hover: hover) and (pointer: fine)`; reduced motion keeps them still.
- The demo `<dialog>` opens in 200ms and closes in 150ms with `@starting-style` and `allow-discrete`; `scale 0.96 → 1`
  only without reduced motion. It loads the live demo with `?showcase=landing` and waits for the
  `qmenut:showcase-ready` handshake; without JS the card is a plain link.

## Keeping it working

- Captures are 2x (780 × 1400). Bands in `stackCaptures` and hairline points in `stackFacts` are percentages of the
  capture: recheck them whenever the menu layout changes, then recapture:

  ```sh
  bun run --cwd e2e showcase:capture
  cd apps/landing/public/assets/showcase && for f in *.png; do cwebp -quiet -q 82 "$f" -o "${f%.png}.webp" && rm "$f"; done
  ```

- The showcase tenants are seeded on dev from `qmenut-ops` (`bun run showcase:seed`). Step names and the message
  parser live in `packages/ui/src/theme/showcase.ts`; the web app only changes display state for them.
- Not yet verified: scrub performance on mid-range Android. `--build`/`--lift` are inherited custom properties, so
  each frame recalculates ~180 descendants and repaints ~45 clip paths. Profile with 4× CPU throttling before
  adding more planes.
