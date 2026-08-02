import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("background service worker", () => {
  it("wires runtime initialization and message routing", () => {
    const source = readFileSync(join(process.cwd(), "src/background/service-worker.ts"), "utf8");
    expect(source).toContain("new RuntimeManager()");
    expect(source).toContain("chrome.runtime.onMessage.addListener");
    expect(source).toContain("GET_RUNTIME_STATUS");
    expect(source).toContain("START_CAPTURE");
    expect(source).toContain("chrome.runtime.getManifest()");
    expect(source).toContain("manifest.content_scripts");
    expect(source).toContain("getContentScriptFile()");
  });
});
