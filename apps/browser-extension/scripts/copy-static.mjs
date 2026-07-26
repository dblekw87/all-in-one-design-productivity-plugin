import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";

const files = [
  ["src/popup/popup.css", "dist/src/popup/popup.css"]
];

for (const [from, to] of files) {
  mkdirSync(dirname(join(process.cwd(), to)), { recursive: true });
  copyFileSync(join(process.cwd(), from), join(process.cwd(), to));
}

const manifest = JSON.parse(readFileSync(join(process.cwd(), "manifest.json"), "utf8"));
manifest.background.service_worker = "src/background/service-worker.js";
manifest.content_scripts = manifest.content_scripts.map((script) => ({
  ...script,
  js: script.js.map((path) => path.replace(/^dist\//, ""))
}));
writeFileSync(join(process.cwd(), "dist", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const popupHtml = readFileSync(join(process.cwd(), "popup.html"), "utf8").replace('src="dist/src/popup/popup.js"', 'src="src/popup/popup.js"');
writeFileSync(join(process.cwd(), "dist", "popup.html"), popupHtml);

for (const size of [16, 48, 128]) {
  const iconPath = join(process.cwd(), "dist", "icons", `icon-${size}.png`);
  mkdirSync(dirname(iconPath), { recursive: true });
  writeFileSync(iconPath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADgwGAVp8uWQAAAABJRU5ErkJggg==", "base64"));
}
