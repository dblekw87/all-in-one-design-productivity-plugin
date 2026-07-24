import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/main/index.ts"),
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "main/index.js",
      },
    },
  },
});
