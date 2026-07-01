import path from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tanstackStart({
      srcDirectory: "src/app",
      router: {
        generatedRouteTree: "route-tree.gen.ts",
        routesDirectory: "routes",
      },
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
      pages: [{ path: "/" }, { path: "/promos" }, { path: "/contacto" }],
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(appDir, "./src"),
      "@app": path.resolve(appDir, "./src/app"),
    },
  },
  server: {
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
