import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";

const files = [
  ["manifest.json", "dist/manifest.json"],
  ["popup.html", "dist/popup.html"],
  ["src/popup/popup.css", "dist/src/popup/popup.css"]
];

for (const [from, to] of files) {
  mkdirSync(dirname(join(process.cwd(), to)), { recursive: true });
  copyFileSync(join(process.cwd(), from), join(process.cwd(), to));
}

for (const size of [16, 48, 128]) {
  const iconPath = join(process.cwd(), "dist", "icons", `icon-${size}.png`);
  mkdirSync(dirname(iconPath), { recursive: true });
  writeFileSync(iconPath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADgwGAVp8uWQAAAABJRU5ErkJggg==", "base64"));
}
