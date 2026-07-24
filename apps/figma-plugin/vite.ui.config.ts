import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

function inlineUiAssets() {
  return {
    name: "aio-inline-ui-assets",
    apply: "build" as const,
    closeBundle() {
      const outputPath = path.resolve(__dirname, "dist/index.html");
      let html = fs.readFileSync(outputPath, "utf8");

      html = html.replace(
        /<link[^>]+href="\.\/assets\/([^"]+\.css)"[^>]*>/,
        (_match, assetName: string) => {
          const css = fs.readFileSync(path.resolve(__dirname, "dist/assets", assetName), "utf8");
          return `<style>${css}</style>`;
        }
      );
      html = html.replace(
        /<script[^>]+src="\.\/assets\/([^"]+\.js)"[^>]*><\/script>/,
        (_match, assetName: string) => {
          const javascript = fs
            .readFileSync(path.resolve(__dirname, "dist/assets", assetName), "utf8")
            .replace(/<\/script/gi, "<\\/script");
          return `<script>window.addEventListener("DOMContentLoaded",function(){${javascript}\n});</script>`;
        }
      );

      fs.writeFileSync(outputPath, html, "utf8");
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), inlineUiAssets()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
      output: {
        format: "iife",
        inlineDynamicImports: true,
        name: "AioPluginUi",
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    },
  },
});
