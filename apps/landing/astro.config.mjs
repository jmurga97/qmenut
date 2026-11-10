import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

// React only powers the /empezar sign-up island; every other page ships no JavaScript framework.
export default defineConfig({
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [react()],
  output: "server",
  session: false,
});
