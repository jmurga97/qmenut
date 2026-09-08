import path from "node:path";
import { fileURLToPath } from "node:url";
import { fixupPluginRules } from "@eslint/compat";
import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginLit from "eslint-plugin-lit";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import pluginWc from "eslint-plugin-wc";
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

const reactFiles = ["apps/admin/src/**/*.{ts,tsx}", "apps/web/src/**/*.{ts,tsx}"];
const workerFiles = ["apps/api/src/**/*.ts"];
// Hand-written, unbundled, and served as a classic worker straight from the assets binding,
// so it sits outside every `src/**` glob above.
const serviceWorkerFiles = ["apps/web/public/sw.js"];
const litFiles = ["packages/ui/src/components/**/*.ts"];

const tsconfigPaths = [
  "apps/admin/tsconfig.json",
  "apps/web/tsconfig.json",
  "apps/api/tsconfig.json",
  "apps/tenant-config/tsconfig.json",
  "packages/auth/tsconfig.json",
  "packages/db/tsconfig.json",
  "packages/ui/tsconfig.json",
].map((projectPath) => path.join(rootDir, projectPath));

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

const importPluginCompat = fixupPluginRules(importPlugin);
const jsxA11yCompat = fixupPluginRules(jsxA11y);
const pluginReactCompat = fixupPluginRules(pluginReact);

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: typeScriptFiles,
}));

const mergeFlatRules = (configs) => Object.assign({}, ...configs.map((config) => config.rules ?? {}));

const rulesAsErrors = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([ruleName, ruleConfig]) => {
      if (ruleConfig === "off" || ruleConfig === 0) {
        return [ruleName, ruleConfig];
      }

      if (Array.isArray(ruleConfig)) {
        return [ruleName, ["error", ...ruleConfig.slice(1)]];
      }

      return [ruleName, "error"];
    }),
  );

const qualityTypeScriptRules = {
  ...rulesAsErrors(sonarjs.configs.recommended.rules),
  ...rulesAsErrors(unicorn.configs.recommended.rules),
  "unicorn/filename-case": [
    "error",
    {
      cases: {
        kebabCase: true,
        snakeCase: true,
      },
      checkDirectories: false,
    },
  ],
  "sonarjs/prefer-read-only-props": "off",
  "sonarjs/public-static-readonly": "off",
  "unicorn/consistent-boolean-name": "off",
  "unicorn/consistent-class-member-order": "off",
  "unicorn/name-replacements": "off",
  "unicorn/no-non-function-verb-prefix": "off",
  "unicorn/no-null": "off",
  "unicorn/no-top-level-side-effects": "off",
  // Only when the local binding is a pure pass-through: re-exporting a name the file also
  // uses would duplicate the module specifier instead of removing a line.
  "unicorn/prefer-export-from": ["error", { checkUsedVariables: false }],
  "unicorn/prefer-global-this": "off",
  "unicorn/switch-case-braces": "off",
};

const sharedTypeScriptRules = {
  ...qualityTypeScriptRules,
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
      ignore: ["^bun:test$", "^cloudflare:", "\\.css$", "\\?.*$"],
    },
  ],
};

const reactRules = {
  ...pluginReact.configs.flat.recommended.rules,
  ...pluginReact.configs.flat["jsx-runtime"].rules,
  ...jsxA11y.configs.recommended.rules,
  ...mergeFlatRules(pluginQuery.configs["flat/recommended"]),
  // Full set, not just rules-of-hooks/exhaustive-deps: these encode the invariants the React
  // Compiler relies on, so a violation is also a silent bail-out in apps/web's compiled build.
  ...reactHooks.configs.recommended.rules,
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
};

export default defineConfig(
  {
    ignores: [
      "**/dist/**",
      "**/.output/**",
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
      import: importPluginCompat,
      sonarjs,
      unicorn,
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
      react: pluginReactCompat,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11yCompat,
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
    files: reactFiles,
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
    // react-hook-form's `field` and any controller object that exposes a ref are ref-shaped, so
    // `refs` flags every property read off them. apps/admin is not compiled by React Compiler, so
    // demote it there rather than sprinkle suppressions; it stays an error in apps/web.
    files: ["apps/admin/src/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/refs": "warn",
    },
  },
  {
    files: ["apps/admin/src/app/routes/**/*.{ts,tsx}", "apps/web/src/app/routes/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
      "unicorn/filename-case": "off",
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
    files: serviceWorkerFiles,
    // Only the base recommended rules: the type-checked stacks would need a tsconfig entry
    // for a file that is deliberately plain, unbundled JavaScript.
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      // A classic service worker, not an ES module, despite the package being "type": "module".
      sourceType: "script",
      globals: { ...globals.serviceworker },
    },
  },
  {
    files: ["apps/*/tests/**/*.{ts,tsx}", "packages/*/tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    files: litFiles,
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      lit: pluginLit,
      wc: pluginWc,
    },
    rules: {
      ...pluginLit.configs["flat/recommended"].rules,
      ...pluginWc.configs["flat/recommended"].rules,
    },
  },
);
