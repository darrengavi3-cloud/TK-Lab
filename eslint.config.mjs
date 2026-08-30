import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Canonical atlas, vendored libraries and generated deployment copies are
    // validated by their own release checks; lint only maintained Site code.
    "atlas/**",
    "public/legacy/**",
    "examples/**",
    "drizzle/**",
  ]),
]);

export default eslintConfig;
