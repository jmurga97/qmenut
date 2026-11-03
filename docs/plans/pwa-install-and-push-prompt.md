# Admin PWA install and push prompt: implementation plan

Status: implemented, not committed. Admin, plus one API mutation (`sendTestPush`) for improvement 3; no schema changes.

Two UX gaps in the installed admin:

1. **Install.** The sidebar "Install app" button only appears after Chromium fires
   `beforeinstallprompt`. Safari on macOS, Firefox, and Brave (which often holds the event
   back) get no button at all, even though their browser menu can install the admin. iOS
   gets a cramped one-line hint.
2. **Push after (re)install.** On iPhone and iPad each home-screen install has its own
   storage, cookies and notification permission. A reinstall signs the member out and drops
   the push subscription; push only comes back if they find the control on
   `/notifications`. Nothing tells them.

## What exists today

- `src/shared/hooks/use-install-prompt.ts`: captures `beforeinstallprompt` before React
  mounts (`main.tsx:57`). `getMode()` returns `"prompt"` (event held), `"ios"` (iOS, not
  installed) or `"hidden"` (installed, or any other browser without the event).
- `src/app/shell/admin-sidebar.tsx:96-103`: footer shows a button for `"prompt"`, a text
  line for `"ios"`.
- `src/features/notifications/hooks/use-push-device.ts`: `usePushDevice()` with statuses
  `loading | unsupported | iosInstall | unavailable | denied | off | on`.
- `src/features/notifications/components/push-device-control.tsx`: the "this device"
  control (branch picker + turn on/off), mounted only on the notifications page.
- Dialogs use `@base-ui/react/dialog` with `admin-dialog-*` classes
  (`src/shared/images/logo-crop-dialog.tsx`).

## Part 1: install button that always works

One "Install app" button in the sidebar footer, shown whenever the admin is not running
installed. What it does depends on the browser:

| Browser state                                                                  | Tap does                                                          |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `beforeinstallprompt` held (Chrome, Edge, Brave)                               | Native install dialog (as today)                                  |
| iOS / iPadOS                                                                   | Steps dialog: Share → Add to Home Screen                          |
| Safari on macOS                                                                | Steps dialog: File → Add to Dock                                  |
| Anything else (Brave without event, Firefox Android, Chrome holding the event) | Steps dialog: browser menu → "Install app" / "Add to Home Screen" |

Changes:

- `use-install-prompt.ts`: `InstallMode` becomes `"hidden" | "prompt" | "manual"`.
  `"manual"` replaces `"ios"` and covers every non-installed browser without the event.
  Export `getInstallSteps(): "ios" | "macSafari" | "browserMenu"` (UA check: iOS via the
  existing `isIos()`, macOS Safari as `/Macintosh/` + `/Safari/` without
  `/Chrome|Chromium|Edg|Firefox/`). Brave reports a Chrome UA, so it lands on
  `browserMenu`, which is correct for it.
- Desktop Firefox: return `"hidden"` (`/Firefox/` without `/Android/`): it cannot install
  sites, so steps would be wrong.
- New `src/shared/components/install_app_dialog/install_app_dialog.tsx`: base-ui dialog,
  title "Install QMenut", one short paragraph for the steps variant, one sentence on why
  ("Opens like an app and receives notifications on this device"), a Close button.
- `admin-sidebar.tsx`: drop the `"ios"` span; the button shows for `"prompt"` and
  `"manual"`. `"prompt"` calls `install()`; `"manual"` opens the dialog.
- `appinstalled` already publishes `null`; after an install from a browser tab the mode
  falls to `"manual"` again in that tab (the tab itself is not standalone). Accepted: the
  tab is usually closed for the installed window, and the button is a quiet ghost button.
- i18n: new keys in `src/lib/locales/{es,en}/translation.json`; remove
  `shell___Instalar: Compartir → Añadir a inicio`.

## Part 2: push prompt in the installed app

A soft-ask dialog when the installed admin starts and this device has push off. The
browser permission prompt still only ever opens from the member's tap (iOS Safari
requires it; Chrome hides prompts without a gesture), so the design rule "never on its
own" holds.

Show the dialog when **all** of these are true:

- `isStandalone()`: installed app only. Browser tabs keep the control on `/notifications`.
- `usePushDevice().status === "off"` (supported, VAPID configured, not denied, not
  subscribed). `denied`, `unsupported`, `unavailable` never show it.
- Not a Qmenut support account (`isInternalSupportEmail`): they never receive restaurant
  notifications, so a subscription would be dead weight.
- A branch is selected.
- Not snoozed: `localStorage["qmenut-push-prompt-snoozed-until"]` is missing or past.
  Reads and writes in `try/catch`, like `theme_preference.tsx`.

Trigger: on shell mount, not on the login route. Sessions last 90 days, so "after sign
in" alone would almost never fire; on iOS a reinstall means a fresh storage and a fresh
login anyway, which also clears the snooze. Net effect: asked once per install, and again
14 days after "Not now".

Changes:

- New `src/features/notifications/components/push_prompt_dialog.tsx`: checks the
  conditions above, renders a base-ui dialog with `PushDeviceControl` inside (branch
  picker defaults to the selected branch, as today) and a "Not now" button that writes the
  snooze (now + 14 days) and closes. Closes itself when the status turns `on`; if it turns
  `denied`, the control's existing warning shows and the member closes it.
- `PushDeviceControl`: add an optional `compact` prop that hides its own `<h2>` and
  description inside the dialog (the dialog title says it). Nothing else changes.
- `admin-shell.tsx`: mount `<PushPromptDialog selectedBranchId=… />` next to the bell,
  only when `isStandalone()`, so `usePushDevice()` and its queries never run in tabs.
- Export it from the notifications feature barrel; the app layer may import features.
- i18n: dialog title ("Turn on notifications on this device?"), "Not now".
- Docs: `docs/design/notifications-ux.md`, _Push devices_: add the installed-app prompt
  and its snooze; fix the stale "the user menu has the control" (the admin has no user
  menu). `docs/domains/notifications.md` if it repeats it.

## Verification

- `bun run --cwd apps/admin build`, `bun run lint`, `bun run check`.
- Browser pane, dev server: Chrome tab shows the native prompt path; emulate
  `display-mode: standalone` via CDP (`Emulation.setEmulatedMedia`) to see the push
  dialog, "Not now" writes the snooze, turning on closes it.
- Real devices before merging: iPhone (install, sign in, dialog appears, push arrives),
  Brave desktop (button opens steps), Safari macOS (Add to Dock steps).
- No new unit or E2E tests unless asked.

## Recommended improvements (not in this plan unless approved)

Ranked by value for effort:

1. **App icon badge.** In the installed app, mirror the bell count on the home-screen /
   dock icon with `navigator.setAppBadge(count)` (Chromium desktop, iOS 16.4+ installed).
   Two lines in `notification-bell.tsx` where the count already lives, plus
   `clearAppBadge()` at 0. Staff see pending items without opening the app.
2. **Keep the device language in sync.** A device stores the admin language from when push
   was turned on. If the member switches language later, pushes stay in the old one. When
   status is `on` and `getAdminLanguage()` differs from what the device was saved with,
   call `saveDevice` again (needs the `device` query to return `language`, a one-field
   change in the router and repository).
3. **"Send a test notification" button** in the control once push is on. Confirms the
   whole chain (permission, subscription, queue, VAPID) at setup time, which is when staff
   are looking. Needs one tRPC mutation that enqueues a push to the caller's device only.
4. **Richer install dialog on Chrome/Android.** Add `description`, `id: "/"` and two
   `screenshots` to `public/manifest.webmanifest`. Chrome then shows an app-store-style
   install sheet instead of the bare one-line dialog. Manifest-only change plus images.
5. **Measure it.** `standaloneShare` already exists in analytics; send a PostHog event on
   `appinstalled` and on push turn-on from the dialog vs. the page, to know whether the
   prompt earns its interruption.
