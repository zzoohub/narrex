import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Architecture test: prevent passing JSX directly as component props.
 *
 * SolidJS SSR compiler wraps JSX props in getters (lazy),
 * but the client compiler evaluates them eagerly (before parent),
 * causing hydration key mismatch → "template2 is not a function".
 *
 * ✗ icon={<Icon />}
 * ✓ icon={() => <Icon />}
 *
 * Built-in SolidJS props like `fallback` on <Show>/<Suspense> are excluded.
 */

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) {
      results.push(fullPath);
    }
  }
  return results;
}

// Props where JSX is safe (SolidJS built-in components handle these correctly)
const SAFE_PROPS = new Set(["fallback", "children", "each", "when", "keyed"]);

// Matches: propName={<Component ... or propName={<div ...
// Captures the prop name for filtering
const JSX_AS_PROP_PATTERN = /(\w+)=\{<[A-Z]/g;

describe("no JSX passed directly as props", () => {
  it("should use arrow functions instead of direct JSX for component props", () => {
    const srcDir = join(import.meta.dirname, "..");
    const files = collectTsxFiles(srcDir);
    const violations: string[] = [];

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        let match: RegExpExecArray | null;
        JSX_AS_PROP_PATTERN.lastIndex = 0;

        while ((match = JSX_AS_PROP_PATTERN.exec(line)) !== null) {
          const propName = match[1]!;
          if (!SAFE_PROPS.has(propName)) {
            const rel = relative(srcDir, filePath);
            violations.push(`${rel}:${i + 1} — ${propName}={<JSX>} → use ${propName}={() => <JSX>}`);
          }
        }
      }
    }

    expect(violations, [
      "JSX passed directly as props causes hydration mismatch in SolidJS.",
      "Wrap with arrow function: icon={() => <Icon />}",
      "",
      "Violations:",
      ...violations,
    ].join("\n")).toEqual([]);
  });
});
