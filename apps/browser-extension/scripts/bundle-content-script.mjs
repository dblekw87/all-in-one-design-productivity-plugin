/* global console */
import { build } from "esbuild";
import process from "node:process";

await build({
  entryPoints: ["src/content/content-script.ts"],
  outfile: "dist/src/content/content-script.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  logLevel: "info"
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
