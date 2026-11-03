import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      generatedRouteTree: "./src/app/route-tree.gen.ts",
      routesDirectory: "./src/app/routes",
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // Local API from `bun run --cwd apps/api dev`; it trusts LAB_DEV_STAFF_EMAIL in place of Cloudflare Access.
  server: { proxy: { "/trpc": "http://localhost:8787" } },
  build: { outDir: "dist", sourcemap: true },
});
