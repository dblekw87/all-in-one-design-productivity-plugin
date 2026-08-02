import { describe, expect, it } from "vitest";
import { collectDiagnostics } from "../src/runtime/diagnostics.js";
import { ExtensionRuntime } from "../src/runtime/extension-runtime.js";
import type { ChromeApi } from "../src/shared/chrome-types.js";

describe("diagnostics", () => {
  it("reports version, permissions, tab, runtime, mode, and support", async () => {
    const runtime = new ExtensionRuntime();
    runtime.initialize();
    const chromeApi: ChromeApi = {
      runtime: {
        onInstalled: { addListener: () => undefined },
        onMessage: { addListener: () => undefined },
        sendMessage: async () => undefined,
        getManifest: () => ({ version: "0.1.0", manifest_version: 3 })
      },
      tabs: {
        query: async () => [{ id: 9, url: "https://example.com/", title: "Example", active: true }],
        get: async () => ({ id: 9, windowId: 1, url: "https://example.com/", title: "Example", active: true }),
        captureVisibleTab: async () => "data:image/png;base64,AA==",
        sendMessage: async () => undefined
      },
      scripting: { executeScript: async () => [] },
      permissions: { contains: async () => true }
    };

    expect(await collectDiagnostics(chromeApi, runtime)).toMatchObject({
      version: "0.1.0",
      manifestVersion: 3,
      currentMode: "BROWSER_TAB",
      connectedTab: { tabId: 9 },
      runtimeStatus: { state: "READY" },
      captureSupport: { browserTab: true, dom: true, style: true, geometry: true, screenshot: false }
    });
  });
});
