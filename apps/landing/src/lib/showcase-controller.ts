import { isShowcaseReady, SHOWCASE_UPDATE } from "@qmenut/ui/theme/showcase";

import type { ShowcaseStep } from "@qmenut/ui/theme/showcase";

function setStep(stack: HTMLElement, step: string) {
  if (stack.dataset.step === step) return;
  stack.dataset.step = step;
  for (const element of stack.querySelectorAll<HTMLElement>("[data-for]")) {
    element.toggleAttribute("data-on", element.dataset.for!.split(" ").includes(step));
  }
}

// Desktop: the sticky stack in each block shows the feature being read, the last one past the middle line.
function initStacks() {
  const desktop = window.matchMedia("(min-width: 64rem) and (prefers-reduced-motion: no-preference)");
  if (!CSS.supports("animation-timeline: view()")) return;
  const blocks = [...document.querySelectorAll<HTMLElement>("[data-story-block]")].map((block) => ({
    stack: block.querySelector<HTMLElement>(".story-stage [data-stack]")!,
    features: [...block.querySelectorAll<HTMLElement>(".story-features [data-step]")],
  }));
  let scheduled = false;
  function update() {
    scheduled = false;
    if (!desktop.matches) return;
    const line = window.innerHeight * 0.55;
    for (const { stack, features } of blocks) {
      const reached = features.findLast((item) => item.getBoundingClientRect().top < line);
      const active = reached ?? features[0];
      for (const item of features) item.toggleAttribute("data-active", item === active);
      setStep(stack, active.dataset.step!);
      // Step flows (the rate change) wait at their start until the reader actually reaches the block.
      stack.toggleAttribute("data-motion", true);
      stack.toggleAttribute("data-live", !!reached);
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  desktop.addEventListener("change", schedule);
  update();
}

// Phone: each inline stack plays its step flow once most of it is on screen, and rewinds when it leaves.
function initInlineFlows() {
  if (!CSS.supports("animation-timeline: view()")) return;
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.toggleAttribute("data-live", entry.isIntersecting);
    },
    { threshold: 0.6 },
  );
  for (const stack of document.querySelectorAll<HTMLElement>(".stack--inline")) {
    stack.toggleAttribute("data-motion", true);
    observer.observe(stack);
  }
}

// Templates: a card opens its live demo in a dialog; without JavaScript the link opens the demo itself.
function initTemplates() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-template-dialog]");
  if (!dialog) return;
  const frame = dialog.querySelector<HTMLIFrameElement>("[data-dialog-frame]")!;
  const link = dialog.querySelector<HTMLAnchorElement>("[data-dialog-link]")!;
  let current: { host: string; step: ShowcaseStep } | null = null;

  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (!current || event.origin !== current.host || !Object.is(event.source, frame.contentWindow)) return;
    if (!isShowcaseReady(event.data)) return;
    frame.contentWindow!.postMessage({ type: SHOWCASE_UPDATE, step: current.step }, current.host);
    dialog.toggleAttribute("data-ready", true);
  });
  for (const card of document.querySelectorAll<HTMLAnchorElement>("[data-template-open]")) {
    card.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      current = { host: card.dataset.host!, step: card.dataset.step as ShowcaseStep };
      link.href = current.host;
      link.textContent = `${card.dataset.name} ↗`;
      // As if the guest had scanned the table QR, so stamps and rewards can be tried.
      frame.src = `${current.host}/?showcase=landing&utm_source=qr`;
      dialog.showModal();
    });
  }
  dialog.querySelector("[data-dialog-close]")!.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    current = null;
    frame.removeAttribute("src");
    dialog.removeAttribute("data-ready");
  });
}

export function initShowcase(): void {
  initStacks();
  initInlineFlows();
  initTemplates();
}
