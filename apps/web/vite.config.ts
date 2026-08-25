import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import type { Plugin } from "vite";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const SSR_NODE_CONDITIONS = ["node", "module", "import", "default"];

// Deployed dev-worker builds share the PostHog project with production; bake an empty key
// so analytics compiles out entirely and dev traffic never pollutes real data.
const isDevWorkerBuild = process.env.CLOUDFLARE_ENV === "development";

function ssrNodeConditions(): Plugin {
  return {
    name: "qmenut:ssr-node-conditions",
    resolveId(source) {
      if (source === "cloudflare:workers" && this.environment.name === "client") {
        // Rollup resolves dynamic imports before eliminating import.meta.env.SSR branches.
        return { id: source, external: true };
      }
    },
    configEnvironment(name, options) {
      if (name !== "ssr") {
        return;
      }

      options.resolve ??= {};
      // Mutate instead of returning a partial: Vite concatenates condition arrays when merging.
      options.resolve.conditions = [...SSR_NODE_CONDITIONS];
    },
    configResolved(config) {
      const conditions = config.environments.ssr?.resolve.conditions ?? [];

      if (conditions.includes("browser")) {
        throw new Error("The SSR environment must not resolve browser exports");
      }
    },
  };
}

export default defineConfig({
  define: isDevWorkerBuild ? { "import.meta.env.VITE_POSTHOG_KEY": JSON.stringify("") } : undefined,
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      persistState: { path: "../../.wrangler-shared/state" },
    }),
    tanstackStart({
      srcDirectory: "src/app",
      router: {
        generatedRouteTree: "route-tree.gen.ts",
        routesDirectory: "routes",
      },
    }),
    react(),
    ssrNodeConditions(),
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
    proxy: {
      "/trpc": {
        target: "http://127.0.0.1:8787",
        changeOrigin: false,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
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
