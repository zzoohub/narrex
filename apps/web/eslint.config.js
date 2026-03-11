import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/typescript";
import tseslint from "typescript-eslint";
import * as tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...solid,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "tsconfig.json",
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // tseslint handles this — disable base rule to avoid duplicates
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // SolidJS ref pattern: let ref!: HTMLElement (assigned via ref={})
      "no-unassigned-vars": "off",
      // Gradually tighten — existing code has many `any` usages
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: [
      "dist/",
      ".output/",
      ".vinxi/",
      "src/routeTree.gen.ts",
      "*.config.*",
    ],
  },
);
