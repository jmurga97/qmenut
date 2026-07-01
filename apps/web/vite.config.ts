import path from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appDir = path.dirname(fileURLToPath(import.meta.url));

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
