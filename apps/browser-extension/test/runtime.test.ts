import { describe, expect, it } from "vitest";
import { ExtensionRuntime } from "../src/runtime/extension-runtime.js";

const metadata = {
  url: "https://example.com/",
  title: "Example",
  viewportWidth: 1440,
  viewportHeight: 900,
  documentWidth: 1440,
  documentHeight: 1800,
  scrollX: 0,
  scrollY: 12,
  devicePixelRatio: 1,
  language: "ko-KR",
  theme: "light" as const
};

describe("extension runtime", () => {
  it("initializes and creates metadata-only capture snapshots", () => {
    const runtime = new ExtensionRuntime();
    runtime.initialize();
    expect(runtime.status()).toMatchObject({ state: "READY", currentMode: "BROWSER_TAB" });

    const response = runtime.startCapture(7, metadata, new Date("2026-07-26T00:00:00.000Z"));
    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.message);
    expect(response.session).toMatchObject({ tabId: 7, captureMode: "BROWSER_TAB", status: "METADATA_READY" });
    expect(response.snapshot.version).toBe("1.0");
    expect(response.snapshot.metadata).toMatchObject({
      captureMode: "BROWSER_TAB",
      captureProvider: "browser-extension",
      locale: "ko-KR"
    });
    expect(response.snapshot.metrics.domCount).toBe(0);
  });
});
