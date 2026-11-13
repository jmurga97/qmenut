import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

import { showcaseLocale, showcaseTenants, SHOWCASE_STEPS } from "../../apps/landing/src/lib/showcase";

import type { ShowcaseStep } from "../../apps/landing/src/lib/showcase";

// Capture the actual app through its trusted parent, including the ready/message handshake.
const parentUrl = "http://localhost:4321/__showcase_capture";
const output = new URL("../../apps/landing/public/assets/showcase/", import.meta.url);
const localWeb = process.env.SHOWCASE_WEB_URL;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 440, height: 760 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
try {
  await mkdir(output, { recursive: true });
  await page.route(parentUrl, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body style='margin:0'></body></html>" }),
  );
  if (localWeb) {
    await page.route("https://*.dev.qmenut.app/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: `${localWeb}${url.pathname}${url.search}`,
        headers: { ...route.request().headers(), host: url.hostname },
      });
      await route.fulfill({ response });
    });
  }
  for (const [market, tenants] of Object.entries(showcaseTenants)) {
    for (const [index, tenant] of tenants.entries()) {
      const steps: ShowcaseStep[] =
        index === 0
          ? [
              ...SHOWCASE_STEPS.domain,
              ...(market === "es" ? SHOWCASE_STEPS.language : SHOWCASE_STEPS.rate),
              ...SHOWCASE_STEPS.stamps,
              ...SHOWCASE_STEPS.soldOut,
              ...SHOWCASE_STEPS.views,
              "templates:0",
            ]
          : [SHOWCASE_STEPS.templates[index]!];
      for (const step of steps) {
        const captureStep = step === "stamps:2" ? "stamps:1" : step;
        await mount({
          origin: tenant.href,
          path: step === "stamps:2" ? "reservar" : showcaseLocale(step),
          step: captureStep,
        });
        const iframe = page.locator("iframe");
        const frame = page.frameLocator("iframe");
        await frame.locator(`[data-showcase-step="${captureStep}"]`).waitFor({ timeout: 30000 });
        if (step === "stamps:2") {
          await frame.locator('qm-calendar button.day[data-state="available"]').first().click();
          await frame.locator(".reservations-option:not(:disabled)").first().click();
          await frame.locator(".reservations-option:not(:disabled)").first().click();
          await frame.locator("#reservations-contact-title").waitFor();
          await settle(tenant.href);
          const filename = `${tenant.slug}-reserve.webp`;
          const png = await iframe.screenshot({ animations: "disabled" });
          const webp = await page.evaluate(async (base64) => {
            const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
            const canvas = document.createElement("canvas");
            canvas.width = 390;
            canvas.height = 700;
            canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            bitmap.close();
            return canvas.toDataURL("image/webp", 0.8).split(",")[1]!;
          }, png.toString("base64"));
          await writeFile(fileURLToPath(new URL(filename, output)), Buffer.from(webp, "base64"));
          console.log(filename);
          continue;
        }
        await settle(tenant.href);
        const filename = `${tenant.slug}-${step.replace(":", "-")}.png`;
        await iframe.screenshot({ path: fileURLToPath(new URL(filename, output)), animations: "disabled" });
        console.log(filename);
        if (step !== "domain:1") continue;
        // The dish card the landing opens out of the first dish row.
        await frame.locator(".dish-trigger").first().click();
        await page.waitForTimeout(800);
        await iframe.screenshot({
          path: fileURLToPath(new URL(`${tenant.slug}-dish.png`, output)),
          animations: "disabled",
        });
        console.log(`${tenant.slug}-dish.png`);
      }
    }
  }
} finally {
  await browser.close();
}

async function mount({ origin, path, step }: { origin: string; path: string; step: ShowcaseStep }) {
  await page.goto(parentUrl);
  await page.evaluate(
    ({ origin, path, step }) => {
      const iframe = document.createElement("iframe");
      iframe.width = "390";
      iframe.height = "700";
      iframe.style.border = "0";
      iframe.title = "Captura de la carta";
      window.addEventListener("message", (event) => {
        if (
          event.origin === origin &&
          Object.is(event.source, iframe.contentWindow) &&
          event.data?.type === "qmenut:showcase-ready"
        ) {
          iframe.contentWindow!.postMessage({ type: "qmenut:showcase", step }, origin);
        }
      });
      iframe.src = `${origin}/${path}?showcase=landing`;
      document.body.append(iframe);
    },
    { origin, path, step },
  );
}

async function settle(origin: string) {
  await page.waitForLoadState("networkidle");
  const documentFrame = page.frames().find((item) => item.url().startsWith(origin))!;
  await documentFrame.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}
