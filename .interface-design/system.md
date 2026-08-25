# QMenut Admin Design System

## Direction

- **Audience:** Restaurant owners and operators moving between branch, menu, publishing, and service tasks.
- **Personality:** Calm, precise, hospitable, and operationally dense without feeling clinical.
- **Domain:** Service counter, menu ledger, branch roster, publishing checklist, allergen compliance, and live venue status.
- **Color world:** Receipt paper, stainless steel, charcoal ink, herb green, paprika red, and warm white light.
- **Signature:** A single paprika-red service-marker dot identifies the active primary navigation destination.
- **Rejected defaults:** Filled pill navigation, equal metric-card grids, faint color-only selection, and decorative card elevation.

## Foundation

- **System:** Calm Studio, with near-neutral canvas and paper-like surfaces.
- **Depth:** Borders-first. Persistent surfaces have no shadow; shadows are reserved for floating overlays and dialogs.
- **Spacing:** 4px base with a 4, 8, 12, 16, 24, 32, 40px scale.
- **Geometry:** 6px controls, 8px panels and overlays, 1px semantic rules.
- **Typography:** Work Sans for operational UI, Spectral only for restaurant identity and rare top-level identity moments.
- **Motion:** One restrained route-entry sequence; functional control motion stays within 140–220ms and respects reduced motion.

## Color Roles

- **Canvas / surface / ink:** Calm Studio neutral tokens in both light and dark themes.
- **Service green:** Focus, selected form controls, workflow position, and live operational state.
- **Identity red:** `#A44942` light and `#E09A94` dark; active-navigation dot only.
- **Destructive red:** Remains a separate semantic token and is never reused for navigation identity.

## Reusable Patterns

- **Primary navigation:** 36px minimum row, 6px radius, neutral hover, 6px identity-red active dot, stronger active text, no selected fill.
- **Fields:** 42px standard height, visible label, 6px radius, input rule, 3px service-green focus outline with 2px offset.
- **Checkboxes:** 20px visual control within a 40px minimum hit area; service-green checked state plus a check icon.
- **Taxonomy tags:** 40px minimum target, compact pill, visible check icon and service surface when selected; `aria-pressed` remains authoritative.
- **Operational summaries:** One focal metric with divided supporting values instead of equal decorative cards.
- **Lists:** One outer surface with row dividers; metadata is muted and actions remain available on keyboard and mobile.

## Dashboard Patterns (added by the 2026 admin rework)

- **Signature extension:** the paprika service-marker also appears as a 3px vertical bar on the focal metric (`admin-metric--primary`) and as attention-row markers context — identity red still never marks destructive or navigation-fill surfaces.
- **MetricSummary** (`shared/components/metrics/`): focal metric (mono, tabular-nums, ~42px value) over a divided supporting strip; mobile 2-col grid, ≥48rem single row. Never render equal metric cards.
- **StackedBarChart** (`shared/components/charts/stacked-bar-chart.tsx`): hand-rolled SVG, 10px bars / 4px gap / 128px plot, hairline bottom rule only (no axis chrome), first/middle/last x labels, `<title>` tooltips, legend totals tabular. Series tones: `service` green for "live/new", ink at 72% for baseline volume. Empty state = dashed quiet panel, never blank.
- **SegmentedToggle** (`shared/components/controls/segmented-toggle.tsx`): inset control group on canvas background; selected segment gets secondary fill + foreground text; `aria-pressed` authoritative.
- **AttentionPanel:** exceptions live in one bordered card sorted error→warning→info; each row = semantic Badge ("Urgente"/"Aviso"/"Info") + linked label + muted detail; clean state is a single success StatusText line. Rows deep-link to the screen that fixes them.
- **Dashboard hierarchy:** top zone pairs Estado del servicio (focal metrics) beside Atención; middle pairs visits trend (~60%) beside operations column (venue code + redemption queue); availability switches close the page, unavailable dishes sorted first. Sections are permission-gated individually — staff naturally sees only their operational subset.
- **Charts are dependency-free:** no chart libraries; trends extend StackedBarChart or add sibling SVG primitives under `shared/components/charts/`.

## Compatibility Rules

- Preserve routes, permissions, API payloads, form adapters, callbacks, focus behavior, and stored taxonomy identifiers.
- Product-specific styling stays in the admin application; `@ming/components` remains domain-neutral.
- Known system taxonomy codes may receive Spanish display labels, while custom labels and unknown codes pass through unchanged.
