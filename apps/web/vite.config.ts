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
      pages: [{ path: "/" }, { path: "/promos" }, { path: "/contacto" }, { path: "/puntos" }],
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
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
