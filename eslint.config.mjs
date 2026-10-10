// Minimal ESLint v9 flat config. Avoids the legacy `next/core-web-vitals`
// preset because the published version targets Next 16 and is not
// compatible with Next 15. The build and typecheck are the primary
// quality gates; this config catches obvious style issues.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "build/**",
      "next-env.d.ts",
      "out/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
      "config/**/*.{ts,tsx}",
      "types/**/*.{ts,tsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    // Node-only files: scripts, test loader, test fixtures, and
    // preflight. These never run in a browser so `process`,
    // `Headers`, and `URLSearchParams` are always defined.
    files: [
      "scripts/**/*.{js,mjs,cjs}",
      "tests/**/*.mjs",
      "tests/**/*.js",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
];
