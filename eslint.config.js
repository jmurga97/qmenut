import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const sharedParserOptions = {
  projectService: true,
  tsconfigRootDir: rootDir,
};

const appFiles = ["apps/*/src/**/*.{ts,tsx}", "apps/*/tests/**/*.{ts,tsx}"];
const packageFiles = ["packages/*/src/**/*.{ts,tsx}", "packages/*/tests/**/*.{ts,tsx}"];
const typeScriptFiles = [...appFiles, ...packageFiles];

const reactFiles = ["apps/web/src/**/*.{ts,tsx}"];
const workerFiles = ["apps/api/src/**/*.ts"];

const tsconfigPaths = ["apps/web/tsconfig.json", "apps/api/tsconfig.json", "packages/http/tsconfig.json"].map(
  (projectPath) => path.join(rootDir, projectPath),
);

const importSettings = {
  ...importPlugin.flatConfigs.typescript.settings,
  "import/resolver": {
    typescript: {
      alwaysTryTypes: true,
      caseSensitive: false,
      noWarnOnMultipleProjects: true,
      project: tsconfigPaths,
    },
    node: {
      extensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".d.ts"],
    },
  },
};

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: typeScriptFiles,
}));

const mergeFlatRules = (configs) => Object.assign({}, ...configs.map((config) => config.rules ?? {}));

const sharedTypeScriptRules = {
  eqeqeq: ["error", "always"],
  "max-depth": ["warn", 2],
  "max-lines-per-function": [
    "warn",
    {
      max: 80,
      skipBlankLines: true,
      skipComments: true,
    },
  ],
  "max-params": ["warn", 2],
  "no-console": ["warn", { allow: ["error", "log"] }],
  "no-unused-vars": "off",
  "no-warning-comments": [
    "warn",
    {
      location: "anywhere",
      terms: ["fix", "fixme", "todo", "xxx"],
    },
  ],
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      args: "all",
      argsIgnorePattern: "^_",
      caughtErrors: "all",
      caughtErrorsIgnorePattern: "^_",
      destructuredArrayIgnorePattern: "^_",
      ignoreRestSiblings: true,
      varsIgnorePattern: "^_",
    },
  ],
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      prefer: "type-imports",
      fixStyle: "separate-type-imports",
    },
  ],
  "@typescript-eslint/switch-exhaustiveness-check": "error",
  "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
  "import/newline-after-import": "error",
  "import/no-duplicates": "error",
  "import/order": [
    "warn",
    {
      groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "type"],
      "newlines-between": "always",
      alphabetize: { order: "asc", caseInsensitive: true },
    },
  ],
  "import/no-unresolved": [
    "error",
    {
      caseSensitive: false,
      ignore: ["^bun:test$", "\\.css$", "\\?.*$"],
    },
  ],
};

const reactRules = {
  ...pluginReact.configs.flat.recommended.rules,
  ...pluginReact.configs.flat["jsx-runtime"].rules,
  ...jsxA11y.configs.recommended.rules,
  ...mergeFlatRules(pluginQuery.configs["flat/recommended"]),
  "max-lines-per-function": [
    "warn",
    {
      max: 260,
      skipBlankLines: true,
      skipComments: true,
    },
  ],
  "react/jsx-no-constructed-context-values": "error",
  "react/prop-types": "off",
  "react-hooks/exhaustive-deps": "warn",
  "react-hooks/rules-of-hooks": "error",
};

export default defineConfig(
  {
    ignores: [
      "**/dist/**",
      "**/.wrangler/**",
      "**/node_modules/**",
      "**/worker-configuration.d.ts",
      "**/*.config.js",
      "**/*.config.ts",
      "apps/*/src/app/route-tree.gen.ts",
      "apps/*/src/app/routeTree.gen.ts",
      "bun.lock",
    ],
  },
  {
    files: typeScriptFiles,
    ...js.configs.recommended,
  },
  ...typeCheckedConfigs,
  {
    files: typeScriptFiles,
    languageOptions: {
      parserOptions: sharedParserOptions,
      sourceType: "module",
    },
    plugins: {
      import: importPlugin,
    },
    rules: sharedTypeScriptRules,
    settings: importSettings,
  },
  {
    files: reactFiles,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
      },
      parserOptions: sharedParserOptions,
    },
    plugins: {
      react: pluginReact,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "@tanstack/query": pluginQuery,
    },
    rules: reactRules,
    settings: {
      ...importSettings,
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: {
      "react-refresh": reactRefresh,
      "@tanstack/router": pluginRouter,
    },
    rules: {
      ...mergeFlatRules(pluginRouter.configs["flat/recommended"]),
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true, allowExportNames: ["Route"] }],
    },
  },
  {
    files: ["apps/web/src/app/routes/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: workerFiles,
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.worker,
      },
      parserOptions: sharedParserOptions,
    },
    settings: importSettings,
  },
  {
    files: ["apps/*/tests/**/*.{ts,tsx}", "packages/*/tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
);
