// Règles de qualité communes à tout le dépôt. Voir docs/conventions.md.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/.next/**", "**/next-env.d.ts", "**/dist/**", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Imports de types explicites : sépare clairement types et code exécuté.
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Une promesse ignorée doit l'être explicitement avec `void`.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    extends: [...nextVitals],
    settings: { next: { rootDir: "apps/web" } },
  },
  prettier,
);
