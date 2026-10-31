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
const allowIndexing = process.env.CLOUDFLARE_ENV === "production";

function ssrNodeConditions(): Plugin {
  return {
    name: "qmenut:ssr-node-conditions",
    resolveId(source) {
      if (source === "cloudflare:workers" && this.environment.name === "client") {
        // The bundler resolves dynamic imports before eliminating import.meta.env.SSR branches.
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
  define: {
    "import.meta.env.VITE_ALLOW_INDEXING": JSON.stringify(String(allowIndexing)),
    ...(isDevWorkerBuild ? { "import.meta.env.VITE_POSTHOG_KEY": JSON.stringify("") } : {}),
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      // Shares the API Worker's local state so both see the same TENANT_THEME namespace.
      persistState: { path: "../api/.wrangler/state" },
    }),
    tanstackStart({
      srcDirectory: "src/app",
      router: {
        generatedRouteTree: "route-tree.gen.ts",
        routesDirectory: "routes",
      },
    }),
    react({
      include: /\/apps\/web\/src\/.*\.[jt]sx?$/,
      babel: {
        plugins: process.env.QMENUT_REACT_COMPILER === "0" ? [] : [["babel-plugin-react-compiler", {}]],
      },
    }),
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
    // Preserve the Vite 7 browser baseline for guests on older phones.
    target: ["chrome107", "edge107", "firefox104", "safari16"],
    sourcemap: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules\/(?:react|react-dom|scheduler|use-sync-external-store)\//,
            },
            { name: "vendor-data", test: /node_modules\/(?:@tanstack|@trpc)\// },
            { name: "vendor-i18n", test: /node_modules\/[^/]*i18next[^/]*\// },
            { name: "vendor-ui", test: /node_modules\/(?:culori|lit-html|@lit|@lit-labs)\// },
          ],
        },
      },
    },
  },
});
