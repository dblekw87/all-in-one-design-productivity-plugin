import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("manifest", () => {
  it("declares Manifest V3 runtime and permissions", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "manifest.json"), "utf8")) as {
      manifest_version: number;
      permissions: string[];
      host_permissions: string[];
      background: { service_worker: string; type: string };
      action: { default_popup: string };
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(expect.arrayContaining(["activeTab", "tabs", "storage", "scripting"]));
    expect(manifest.host_permissions).toEqual(expect.arrayContaining(["http://*/*", "https://*/*", "http://localhost/*"]));
    expect(manifest.background).toMatchObject({
      service_worker: "dist/src/background/service-worker.js",
      type: "module"
    });
    expect(manifest.action.default_popup).toBe("popup.html");
  });

  it("bundles the content script as a classic script for Chrome", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: { build?: string };
      devDependencies: Record<string, string>;
    };
    const bundler = readFileSync(join(process.cwd(), "scripts/bundle-content-script.mjs"), "utf8");

    expect(packageJson.scripts.build).toContain("scripts/bundle-content-script.mjs");
    expect(packageJson.devDependencies).toHaveProperty("esbuild");
    expect(bundler).toContain('format: "iife"');
    expect(bundler).toContain('outfile: "dist/src/content/content-script.js"');
  });
});
