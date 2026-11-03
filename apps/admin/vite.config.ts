import path from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envPrefix: "VITE_",
  plugins: [
    tanstackRouter({
      generatedRouteTree: "./src/app/route-tree.gen.ts",
      routesDirectory: "./src/app/routes",
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    babel({
      presets: [reactCompilerPreset()],
      include: /\/apps\/admin\/src\/.*\.[jt]sx?$/,
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    // Preserve the Vite 7 browser baseline while replacing the bundler.
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
            { name: "vendor-forms", test: /node_modules\/(?:zod|react-hook-form|@hookform)\// },
            { name: "vendor-state", test: /node_modules\/zustand\// },
          ],
        },
      },
    },
  },
});
