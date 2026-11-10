import { expect, test } from "../../fixtures/test";

// Searchable pages only: legal pages and the loyalty card are noindex and stay out of the sitemap.
const SITEMAP_PATHS = ["", "/contacto", "/destacados"];

test("serves a development-wide noindex policy and localized sitemap through the edge cache", async ({ request }) => {
  const cacheKey = Date.now();
  const robotsUrl = `http://fine.localhost:4011/robots.txt?seo=${cacheKey}`;
  const firstRobots = await request.get(robotsUrl);
  const robotsBody = await firstRobots.text();

  expect(firstRobots.ok(), robotsBody).toBe(true);
  expect(robotsBody).toBe("User-agent: *\nDisallow: /\n");
  expect(firstRobots.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(firstRobots.headers()["x-qmenut-cache"]).toBe("MISS");
  expect((await request.get(robotsUrl)).headers()["x-qmenut-cache"]).toBe("HIT");

  const sitemapUrl = `http://fine.localhost:4011/sitemap.xml?seo=${cacheKey}`;
  const firstSitemap = await request.get(sitemapUrl);
  const sitemap = await firstSitemap.text();

  expect(firstSitemap.ok(), sitemap).toBe(true);
  expect(firstSitemap.headers()["content-type"]).toContain("application/xml");
  expect(firstSitemap.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(firstSitemap.headers()["x-qmenut-cache"]).toBe("MISS");
  // One <url> per language version (es, en).
  expect((sitemap.match(/<url>/g) ?? []).length).toBe(SITEMAP_PATHS.length * 2);
  for (const path of SITEMAP_PATHS) {
    expect(sitemap).toContain(`<loc>https://fine.localhost${path}</loc>`);
    expect(sitemap).toContain(`<loc>https://fine.localhost/en${path}</loc>`);
  }
  expect(sitemap).not.toContain("https://fine.localhost/puntos");
  expect(sitemap).not.toContain("https://fine.localhost/aviso-legal");
  expect(sitemap).toContain('hreflang="x-default"');
  expect((await request.get(sitemapUrl)).headers()["x-qmenut-cache"]).toBe("HIT");
});

test("renders JSON-LD and language alternates on the menu root", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
});

test("hides unavailable loyalty navigation but keeps the direct route available", async ({ page }) => {
  await page.goto("http://fine.localhost:4011/");

  await expect(page.getByRole("tab", { name: "Puntos" })).toHaveCount(0);

  await page.goto("http://fine.localhost:4011/puntos");
  await expect(page.getByRole("heading", { name: "Todavía no hay premios disponibles" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});
