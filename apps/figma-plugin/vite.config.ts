import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        ui: path.resolve(__dirname, "index.html"),
        main: path.resolve(__dirname, "src/main/index.ts")
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "main" ? "main/index.js" : "assets/[name].js"),
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
