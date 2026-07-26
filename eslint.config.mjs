import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "node_modules/**", "coverage/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error"
    }
  },
  {
    files: ["apps/figma-plugin/src/main/**/*.ts"],
    languageOptions: {
      globals: {
        figma: "readonly",
        __html__: "readonly"
      }
    }
  },
  {
    files: ["apps/figma-plugin/src/ui/**/*.tsx", "apps/figma-plugin/src/ui/**/*.ts"],
    languageOptions: {
      globals: {
        parent: "readonly",
        window: "readonly",
        document: "readonly"
      }
    }
  },
  {
    files: ["apps/browser-extension/src/**/*.ts"],
    languageOptions: {
      globals: {
        chrome: "readonly",
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        crypto: "readonly",
        HTMLElement: "readonly",
        HTMLButtonElement: "readonly"
      }
    }
  }
);
