import { describe, expect, it } from "vitest";
import { ExtensionRuntime } from "../src/runtime/extension-runtime.js";

describe("extension runtime", () => {
  it("initializes and creates browser capture sessions", () => {
    const runtime = new ExtensionRuntime();
    runtime.initialize();
    expect(runtime.status()).toMatchObject({ state: "READY", currentMode: "BROWSER_TAB" });

    const begun = runtime.beginCapture(7, new Date("2026-07-26T00:00:00.000Z"));
    expect(begun.ok).toBe(true);
    if (!begun.ok) throw new Error(begun.error.message);
    expect(begun.session).toMatchObject({ tabId: 7, captureMode: "BROWSER_TAB", status: "CAPTURING" });

    const completed = runtime.completeCapture(begun.session.sessionId, {
      status: "COMPLETED",
      warnings: [],
      metrics: {
        nodeCount: 1,
        elementCount: 0,
        textNodeCount: 0,
        styleCount: 0,
        geometryCount: 0,
        pseudoCount: 0,
        inlineSvgCount: 0,
        assetReferenceCount: 0,
        skippedNodeCount: 0,
        hiddenCount: 0,
        flexContainerCount: 0,
        gridContainerCount: 0,
        durationMs: 1,
        truncated: false
      },
      progress: []
    });
    expect(completed).toMatchObject({ status: "COMPLETED" });
    expect(runtime.status()).toMatchObject({ state: "READY" });
  });
});
