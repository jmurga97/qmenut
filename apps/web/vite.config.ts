import path from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
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
    }),
    nitro({
      config: {
        preset: "cloudflare-module",
        devProxy: {
          "/trpc/**": {
            target: "http://127.0.0.1:8787",
          },
        },
        cloudflare: {
          // Shared with apps/tenant-config so `vite dev` sees the KV entries seeded there
          // (wrangler CLIs point at ../../.wrangler-shared/state; wrangler appends /v3).
          dev: {
            persistDir: "../../.wrangler-shared/state/v3",
          },
        },
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      "~": path.resolve(appDir, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
  },
  ssr: {
    external: ["cloudflare:workers"],
    resolve: {
      // Prefer node builds during SSR so lit resolves its @lit-labs/ssr-dom-shim-backed
      // entries instead of the browser build (which touches document/window at module scope).
      conditions: ["node", "module", "import", "default"],
      externalConditions: ["node", "module", "import", "default"],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      // Runtime module provided by the Workers runtime (nitro shims it in dev).
      external: ["cloudflare:workers"],
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("react-dom") ||
            id.includes("/react/") ||
            id.includes("/scheduler/") ||
            id.includes("use-sync-external-store")
          ) {
            return "vendor-react";
          }
          if (id.includes("@tanstack") || id.includes("@trpc")) return "vendor-data";
          if (id.includes("i18next")) return "vendor-i18n";
          if (id.includes("culori") || id.includes("lit-html") || id.includes("@lit")) {
            return "vendor-ui";
          }
        },
      },
    },
  },
});
