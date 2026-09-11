/**
 * Negative fixtures for the lint migration (docs/operations/lint-migration.md).
 *
 * Writes temporary files into the real source tree (so boundaries classifies them with the
 * real element model), runs oxlint on them, and asserts each fails with the expected rule.
 * Everything is cleaned up afterwards.
 */
import { $ } from "bun";

type Fixture = {
  path: string;
  code: string;
  expect: string;
};

const fixtures: Fixture[] = [
  {
    // Feature A (menu) importing feature B (promos) — boundaries/dependencies element-types policy.
    path: "apps/web/src/features/menu/__lint-fixture-cross-feature__.ts",
    code: 'import type { HighlightsContentViewModel } from "~/features/promos/types/highlights-view-model";\n\nexport type Fixture = HighlightsContentViewModel;\n',
    expect: "boundaries(dependencies)",
  },
  {
    // Shared must not import a feature, even through its public SEO entrypoint.
    path: "apps/web/src/shared/__lint-fixture-feature-dependency__.ts",
    code: 'export { buildRestaurantJsonLd } from "~/features/menu/seo/build-restaurant-json-ld";\n',
    expect: "boundaries(dependencies)",
  },
  {
    // Floating promise — typescript/no-floating-promises (type-aware).
    path: "apps/web/src/features/menu/__lint-fixture-floating-promise__.ts",
    code: "export async function fixture(): Promise<number> {\n  Promise.resolve(1);\n  return 1;\n}\n",
    expect: "typescript(no-floating-promises)",
  },
  {
    // Conditional hook call — react/rules-of-hooks.
    path: "apps/web/src/features/menu/__lint-fixture-react-hooks__.tsx",
    code: 'import { useState } from "react";\n\nexport function Fixture({ condition }: { condition: boolean }): number {\n  if (condition) {\n    const [value] = useState(0);\n    return value;\n  }\n  return 0;\n}\n',
    expect: "react-hooks(rules-of-hooks)",
  },
  {
    // Import that cannot resolve — TS2307 via oxlint typeCheck (import/no-unresolved has no
    // native oxlint implementation; the compiler diagnostic is the enforcement).
    path: "apps/web/src/features/menu/__lint-fixture-unresolved-import__.ts",
    code: 'export { fixture } from "./does-not-exist-lint-fixture";\n',
    expect: "typescript(TS2307)",
  },
];

const failures: string[] = [];

try {
  for (const fixture of fixtures) {
    await Bun.write(fixture.path, fixture.code);
  }
  const output = await $`bunx oxlint ${fixtures.map((f) => f.path)}`.nothrow().text();
  for (const fixture of fixtures) {
    const matched = output
      .split("\n")
      .some((line) => line.startsWith(`${fixture.path}:`) && line.includes(fixture.expect));
    console.log(`${matched ? "PASS" : "FAIL"}  ${fixture.path} → expected ${fixture.expect}`);
    if (!matched) failures.push(fixture.path);
  }
} finally {
  for (const fixture of fixtures) {
    await $`rm -f ${fixture.path}`.quiet();
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} fixture(s) did not fail with the expected rule.`);
  process.exit(1);
}
console.log("\nAll fixtures fail with the expected rules.");
