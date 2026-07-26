import { describe, expect, it } from "vitest";
import type { CaptureSnapshot } from "@aio/shared-contracts";
import { validateBrowserCaptureSnapshot, validateCapturedDomSemantics } from "../src/capture/index.js";

const snapshot: CaptureSnapshot = {
  version: "1.0",
  capture: {
    mode: "BROWSER_TAB",
    providerId: "browser-extension",
    source: { mode: "BROWSER_TAB", inputUrl: "https://example.com/", normalizedUrl: "https://example.com/", providerId: "browser-extension", trustedLocalInput: true }
  },
  document: { requestedUrl: "https://example.com/", finalUrl: "https://example.com/", title: "Example", capturedAt: "2026-07-26T00:00:00.000Z" },
  viewport: { width: 100, height: 100, deviceScaleFactor: 1 },
  scroll: { x: 0, y: 0 },
  metadata: { captureMode: "BROWSER_TAB", captureProvider: "browser-extension", captureTime: "2026-07-26T00:00:00.000Z", devicePixelRatio: 1, viewport: { width: 100, height: 100, deviceScaleFactor: 1 }, scroll: { x: 0, y: 0 } },
  dom: { rootCaptureNodeId: "cap_root", nodes: [{ captureNodeId: "cap_root", childCaptureNodeIds: [], nodeType: "DOCUMENT", sourceOrder: 0, depth: 0 }] },
  styles: { entries: [] },
  geometry: { entries: [] },
  assets: { references: [] },
  pseudo: { beforeCount: 0, afterCount: 0 },
  svg: { count: 0, inlineCount: 0, externalCount: 0 },
  screenshots: { captures: [] },
  warnings: [],
  metrics: { domCount: 1, styleCount: 0, geometryCount: 0, svgCount: 0, pseudoCount: 0, assetCount: 0, warningCount: 0, durationMs: 1 }
};

describe("browser capture validation", () => {
  it("validates a complete browser capture snapshot and semantic tree", () => {
    expect(validateBrowserCaptureSnapshot(snapshot)).toEqual({ ok: true, errors: [] });
    expect(validateCapturedDomSemantics(snapshot.dom as { rootCaptureNodeId: string; nodes: never[] })).toEqual({ ok: true, errors: [] });
  });

  it("rejects non-empty screenshots in Step 28", () => {
    expect(validateBrowserCaptureSnapshot({ ...snapshot, screenshots: { captures: [{}] } }).ok).toBe(false);
  });
});
